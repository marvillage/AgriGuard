// Virtual AgriGuard field node: speaks the same telemetry API as the ESP32 firmware.
// Usage: npm run simulate                 (all devices marked "simulated")
//        npm run simulate -- --key agd_... --speed 30 --interval 5
import db from "../src/config/database.js";
import { env } from "../src/config/env.js";
import { getCrop } from "../src/data/crops.js";
import { getSoil, irrigationEfficiency } from "../src/data/soils.js";
import { squareMetresPerAcre } from "../src/lib/geo.js";
import { cropStage, round } from "../src/services/agronomy.service.js";
import { getForecast } from "../src/services/weather.service.js";

const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const speed = Number(option("speed") ?? 20);
const intervalSeconds = Number(option("interval") ?? 5);
const onlyKey = option("key");
const apiUrl = option("api") ?? `http://localhost:${env.port}`;

interface NodeState {
  key: string;
  name: string;
  moisture: number;
  flowTotal: number;
  energyTotal: number;
  tank: number;
  pumpOn: boolean;
  pumpUntil: number;
  nextReport: number;
  lastTick: number;
  battery: number;
  fieldCapacity: number;
  wiltingPoint: number;
  rootMm: number;
  kc: number;
  areaM2: number;
  flowLpm: number;
  powerKw: number;
  efficiency: number;
  latitude: number;
  longitude: number;
  solarKw: number | null;
  flags: { flow: boolean; energy: boolean; tank: boolean; solar: boolean };
  n: number;
  p: number;
  k: number;
}

async function loadNodes() {
  const devices = onlyKey
    ? await db.orm.public.Device.where({ deviceKey: onlyKey }).all()
    : await db.orm.public.Device.where({ simulated: true }).all();
  const nodes: NodeState[] = [];
  for (const device of devices) {
    const field = await db.orm.public.Field.first({ id: device.fieldId });
    if (!field) continue;
    const farm = (await db.orm.public.Farm.first({ id: field.farmId }))!;
    const crop = await db.orm.public.Crop.where({ fieldId: field.id, status: "ACTIVE" }).first();
    const latest = await db.orm.public.FieldObservation.where({ deviceId: device.id }).orderBy((o) => o.observedAt.desc()).first();
    const soil = getSoil(field.soilType);
    const stage = cropStage(crop, getCrop(crop?.cropType ?? crop?.name ?? null));
    const method = (field.irrigationMethod ?? farm.irrigationMethod ?? "flood").toLowerCase();
    nodes.push({
      key: device.deviceKey,
      name: device.name,
      moisture: latest?.soilMoisture ?? soil.fieldCapacity - 6,
      flowTotal: device.lastFlowTotalL ?? latest?.flowTotalL ?? 10000,
      energyTotal: device.lastEnergyTotalKwh ?? latest?.energyTotalKwh ?? 500,
      tank: latest?.tankLevel ?? 75,
      pumpOn: device.pumpOn,
      pumpUntil: 0,
      nextReport: 0,
      lastTick: Date.now(),
      battery: device.batteryPct ?? 85,
      fieldCapacity: field.fieldCapacity ?? soil.fieldCapacity,
      wiltingPoint: soil.wiltingPoint,
      rootMm: 10 * Math.max(0.15, stage.rootDepthM),
      kc: stage.kc,
      areaM2: field.area * squareMetresPerAcre,
      flowLpm: field.pumpFlowLpm ?? 300,
      powerKw: field.pumpPowerKw ?? 3.7,
      efficiency: irrigationEfficiency[method] ?? 0.55,
      latitude: field.latitude ?? farm.latitude ?? 20,
      longitude: field.longitude ?? farm.longitude ?? 78,
      solarKw: farm.solarCapacityKw,
      flags: {
        flow: device.hasFlowMeter || !latest,
        energy: device.hasEnergyMeter,
        tank: device.hasTankSensor,
        solar: device.hasSolar,
      },
      n: latest?.nitrogen ?? 140,
      p: latest?.phosphorus ?? 9,
      k: latest?.potassium ?? 130,
    });
  }
  return nodes;
}

async function weatherNow(node: NodeState) {
  try {
    const forecast = await getForecast(node.latitude, node.longitude);
    const hour = forecast.hourly.find((point) => Math.abs(new Date(point.time).getTime() - Date.now()) < 1800000) ?? forecast.hourly[0];
    return hour;
  } catch {
    return { temperature: 28, humidity: 65, rainMm: 0, et0: 0.2, radiation: 400, time: new Date().toISOString(), rainProbability: 0, windKmh: 5 };
  }
}

async function tick(node: NodeState) {
  const now = Date.now();
  const simulatedHours = ((now - node.lastTick) / 3600000) * speed;
  node.lastTick = now;
  const weather = await weatherNow(node);

  node.pumpOn = node.pumpOn && now < node.pumpUntil;
  let appliedMm = 0;
  if (node.pumpOn) {
    const litres = node.flowLpm * 60 * simulatedHours;
    appliedMm = (litres / node.areaM2) * node.efficiency;
    node.flowTotal += litres;
    node.energyTotal += node.powerKw * simulatedHours;
    node.tank = Math.max(0, node.tank - 6 * simulatedHours);
  } else {
    node.tank = Math.min(95, node.tank + 2 * simulatedHours);
  }

  node.moisture += (weather.rainMm * 0.8 * simulatedHours + appliedMm - weather.et0 * node.kc * simulatedHours) / node.rootMm;
  if (node.moisture > node.fieldCapacity) node.moisture = node.fieldCapacity + (node.moisture - node.fieldCapacity) * 0.5;
  node.moisture = Math.max(node.wiltingPoint - 1, node.moisture);
  node.n = Math.max(40, node.n - 0.02 * simulatedHours);
  const solarW = node.flags.solar && node.solarKw ? Math.round(node.solarKw * weather.radiation * 0.8) : undefined;
  node.battery = Math.max(20, Math.min(100, node.battery + ((solarW ?? weather.radiation) > 200 ? 0.5 : -0.2)));

  if (now < node.nextReport) return;

  const jitter = (scale: number) => (Math.random() - 0.5) * 2 * scale;
  const body = {
    soilMoisture: round(node.moisture + jitter(0.2)),
    soilTemp: round(weather.temperature - 2 + jitter(0.3)),
    airTemp: round(weather.temperature + jitter(0.3)),
    humidity: round(Math.min(100, weather.humidity + jitter(2))),
    nitrogen: round(node.n + jitter(2)),
    phosphorus: round(node.p + jitter(0.5)),
    potassium: round(node.k + jitter(3)),
    ...(node.flags.flow ? { flowTotalL: Math.round(node.flowTotal), flowRateLpm: node.pumpOn ? round(node.flowLpm + jitter(5)) : 0 } : {}),
    ...(node.flags.energy ? { energyTotalKwh: round(node.energyTotal, 3), powerW: node.pumpOn ? Math.round(node.powerKw * 1000 + jitter(60)) : 0 } : {}),
    ...(node.flags.tank ? { tankDistanceCm: round(180 - (node.tank / 100) * 180) } : {}),
    ...(solarW !== undefined ? { solarW } : {}),
    batteryPct: round(node.battery),
    rssi: Math.round(-60 + jitter(5)),
    pumpOn: node.pumpOn,
    firmware: "agriguard-node/1.0.0 (simulator)",
    uptimeSec: Math.round(process.uptime()),
  };

  try {
    const response = await fetch(`${apiUrl}/api/device/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Key": node.key },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { success: boolean; message?: string; data?: { pump: "ON" | "OFF"; runSeconds: number; reason: string; reportEverySeconds: number } };
    if (!result.success || !result.data) {
      console.log(`[${node.name}] server error: ${result.message}`);
      node.nextReport = now + intervalSeconds * 1000;
      return;
    }
    const command = result.data;
    const wasOn = node.pumpOn;
    if (command.pump === "ON" && command.runSeconds > 0) {
      node.pumpOn = true;
      node.pumpUntil = now + (command.runSeconds * 1000) / speed;
    } else {
      node.pumpOn = false;
    }
    const state = node.pumpOn ? "PUMP ON " : "pump off";
    const change = wasOn !== node.pumpOn ? "  <-- changed" : "";
    console.log(`[${new Date().toLocaleTimeString()}] ${node.name.padEnd(26)} moisture ${body.soilMoisture.toFixed(1).padStart(5)}%  ${state}  ${command.reason}${change}`);
    node.nextReport = now + Math.min(intervalSeconds, command.reportEverySeconds) * 1000;
  } catch (error) {
    console.log(`[${node.name}] cannot reach ${apiUrl}: ${(error as Error).message}`);
    node.nextReport = now + intervalSeconds * 1000;
  }
}

async function main() {
  const nodes = await loadNodes();
  if (nodes.length === 0) {
    console.log("No simulated devices found. Register a device with 'simulated' enabled, run npm run seed:demo, or pass --key.");
    process.exit(1);
  }
  console.log(`Simulating ${nodes.length} field node(s) at ${speed}x speed, reporting to ${apiUrl}. Ctrl+C to stop.`);
  for (;;) {
    for (const node of nodes) await tick(node);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
