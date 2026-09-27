// Creates demo farmers (four languages), an agronomist and an FPO coordinator on real cropland.
// The people and farm set-ups are fictional; every reading comes from a public source:
// soil and weather history is Open-Meteo's modelled data for each field's location, crop greenness is
// Sentinel-2 NDVI, and the leaf scan runs the disease model on a real photo. Nothing is simulated, so
// pump runs, savings and trial results stay empty until a real pump node or manual entry records them.
import bcrypt from "bcrypt";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import db from "../src/config/database.js";
import { getCrop } from "../src/data/crops.js";
import { acresFromPolygon, polygonCentroid, type LatLng } from "../src/lib/geo.js";
import { shareCode } from "../src/lib/ids.js";
import { addAdvisorNote } from "../src/services/advisor.service.js";
import { round } from "../src/services/agronomy.service.js";
import { analyzeField } from "../src/services/engine.service.js";
import { syncFieldLedger } from "../src/services/ledger.service.js";
import { refreshNdvi } from "../src/services/ndvi.service.js";
import { syncOpenMeteoReadings } from "../src/services/open-meteo-soil.service.js";
import { createScan } from "../src/services/scan.service.js";
import type { AuthUser } from "../src/utils/auth.types.js";

const historyDays = 21;
const ndviWindows = 5;
const ndviWindowDays = 20;
const password = "agriguard123";
const skipNetwork = process.argv.includes("--offline");

interface FieldSpec {
  name: string;
  soilType: string;
  crop: string;
  planted: string;
  season?: string;
  method: "flood" | "sprinkler" | "drip";
  pumpFlowLpm: number;
  pumpPowerKw: number;
  offset: [number, number];
  size: [number, number];
  solar?: boolean;
  advisorNote?: {
    title: string;
    message: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    type: "IRRIGATION" | "FERTILIZER" | "DISEASE" | "WEATHER" | "GENERAL";
  };
}

interface FarmSpec {
  name: string;
  location: string;
  center: [number, number];
  method: "flood" | "sprinkler" | "drip";
  solarCapacityKw: number | null;
  electricityRate: number;
  description: string;
  advised: boolean;
  shared: boolean;
  fields: FieldSpec[];
}

interface DemoAccount {
  email: string;
  name: string;
  role: "FARMER" | "AGRONOMIST" | "ADMIN";
  phone: string;
  language: string;
  summary: string;
  farms: FarmSpec[];
}

// Farm centres sit on cropland near each town, picked by their Sentinel-2 NDVI in September 2026.
// Phone numbers are placeholders; set a real number in Settings before testing SMS or WhatsApp alerts.
const accounts: DemoAccount[] = [
  {
    email: "demo@agriguard.in",
    name: "Ravi Kumar",
    role: "FARMER",
    phone: "9876543210",
    language: "en",
    summary: "Farmer (English): 2 farms, 4 fields, a test-vs-control water trial",
    farms: [
      {
        name: "Green Valley Farm",
        location: "Nashik, Maharashtra",
        center: [20.0264, 73.9065],
        method: "flood",
        solarCapacityKw: 5,
        electricityRate: 4.02, // MSEDCL LT-IV(B), Case 75/2025, eff. 1 Apr 2026
        description: "Vegetables and pulses on black soil. Borewell with a 5 HP pump and a 5 kW solar array.",
        advised: true,
        shared: true,
        fields: [
          { name: "North Field", soilType: "Black (regur)", crop: "tomato", planted: "2026-08-12", method: "drip", pumpFlowLpm: 180, pumpPowerKw: 3.7, offset: [0.0009, -0.0008], size: [0.0011, 0.0013], solar: true },
          {
            name: "East Plot", soilType: "Black (regur)", crop: "soybean", planted: "2026-07-05", method: "flood", pumpFlowLpm: 420, pumpPowerKw: 3.7, offset: [0.0009, 0.0008], size: [0.0010, 0.0012],
            advisorNote: {
              title: "Check for yellow mosaic on soybean",
              message: "Whiteflies are active around Nashik this week and they spread yellow mosaic. Walk the East Plot rows, pull out plants with yellow patches and send me a Crop Scan photo if you see more than a few.",
              priority: "MEDIUM",
              type: "DISEASE",
            },
          },
          { name: "South Field (control)", soilType: "Black (regur)", crop: "soybean", planted: "2026-07-05", method: "flood", pumpFlowLpm: 420, pumpPowerKw: 3.7, offset: [-0.0005, 0.0008], size: [0.0010, 0.0012] },
        ],
      },
      {
        name: "Sunrise Acres",
        location: "Ludhiana, Punjab",
        center: [30.8368, 75.7005],
        method: "flood",
        solarCapacityKw: null,
        electricityRate: 5.38, // PSPCL Sch. SIV, tariff order 2026-27 (power is free to the farmer; this is the tariff itself)
        description: "Paddy on alluvial soil with a 7.5 HP submersible pump.",
        advised: false,
        shared: false,
        fields: [
          { name: "Canal Block", soilType: "Alluvial", crop: "paddy", planted: "2026-06-28", method: "flood", pumpFlowLpm: 700, pumpPowerKw: 5.5, offset: [0, 0], size: [0.0014, 0.0018] },
        ],
      },
    ],
  },
  {
    email: "sunita@agriguard.in",
    name: "Sunita Devi",
    role: "FARMER",
    phone: "9000000002",
    language: "hi",
    summary: "Farmer (Hindi): solar-pump soybean and maize in Madhya Pradesh",
    farms: [
      {
        name: "Narmada Kisan Farm",
        location: "Dewas, Madhya Pradesh",
        center: [22.9888, 76.0746],
        method: "sprinkler",
        solarCapacityKw: 3,
        electricityRate: 6.36, // MPERC LV-5.1, Petition 140/2025 (farmer pays a flat Rs 750/HP/year subsidy rate; this is the tariff itself)
        description: "Soybean and maize on medium black soil. 3 HP solar pump (PM-KUSUM) with a sprinkler set.",
        advised: true,
        shared: false,
        fields: [
          {
            name: "Bada Khet", soilType: "Black (regur)", crop: "soybean", planted: "2026-06-30", method: "sprinkler", pumpFlowLpm: 250, pumpPowerKw: 2.2, offset: [0.0006, -0.0007], size: [0.0010, 0.0012], solar: true,
            advisorNote: {
              title: "गर्डल बीटल की जाँच करें",
              message: "इस समय सोयाबीन में गर्डल बीटल का प्रकोप हो सकता है। तने पर दो गोल छल्ले दिखें तो पौधे का ऊपरी हिस्सा तोड़कर नष्ट करें और क्रॉप स्कैन से मुझे फ़ोटो भेजें।",
              priority: "MEDIUM",
              type: "DISEASE",
            },
          },
          { name: "Kuan Wala Khet", soilType: "Black (regur)", crop: "maize", planted: "2026-07-08", method: "flood", pumpFlowLpm: 300, pumpPowerKw: 2.2, offset: [-0.0006, 0.0006], size: [0.0009, 0.0011] },
        ],
      },
    ],
  },
  {
    email: "anil@agriguard.in",
    name: "Anil Pawar",
    role: "FARMER",
    phone: "9000000003",
    language: "mr",
    summary: "Farmer (Marathi): drip sugarcane and sprinkler onion with a 7.5 kW solar array",
    farms: [
      {
        name: "Pawar Farms",
        location: "Baramati, Maharashtra",
        center: [18.1514, 74.6415],
        method: "drip",
        solarCapacityKw: 7.5,
        electricityRate: 4.02, // MSEDCL LT-IV(B), Case 75/2025, eff. 1 Apr 2026
        description: "Sugarcane and onion on medium black and loam soils. Farm pond, 7.5 HP pump and a 7.5 kW solar array.",
        advised: false,
        shared: true,
        fields: [
          { name: "Ganna Plot", soilType: "Black (regur)", crop: "sugarcane", planted: "2026-01-20", season: "Suru 2026", method: "drip", pumpFlowLpm: 300, pumpPowerKw: 5.5, offset: [0.0006, -0.0006], size: [0.0010, 0.0011], solar: true },
          { name: "Kanda Plot", soilType: "Loam", crop: "onion", planted: "2026-08-01", method: "sprinkler", pumpFlowLpm: 240, pumpPowerKw: 3.7, offset: [-0.0005, 0.0006], size: [0.0007, 0.0009] },
        ],
      },
    ],
  },
  {
    email: "lakshmi@agriguard.in",
    name: "Lakshmi Reddy",
    role: "FARMER",
    phone: "9000000004",
    language: "te",
    summary: "Farmer (Telugu): drip chilli and flood cotton in Andhra Pradesh",
    farms: [
      {
        name: "Krishna Delta Farm",
        location: "Guntur, Andhra Pradesh",
        center: [16.2467, 80.4365],
        method: "flood",
        solarCapacityKw: null,
        electricityRate: 8.13, // APERC RSTO FY2026-27: power is free to non-corporate farmers; this is the govt subsidy paid per kWh
        description: "Chilli on red soil and cotton on black soil. Borewell with a 5 HP pump.",
        advised: true,
        shared: false,
        fields: [
          {
            name: "Chilli Block", soilType: "Red (sandy loam)", crop: "chilli", planted: "2026-08-05", method: "drip", pumpFlowLpm: 200, pumpPowerKw: 3.7, offset: [0.0005, -0.0006], size: [0.0008, 0.0010],
            advisorNote: {
              title: "Thrips watch on chilli",
              message: "Black thrips has damaged chilli around Guntur in recent seasons. Check the undersides of young leaves and the flowers twice a week, hang blue sticky traps across the block and send me a Crop Scan photo if you find thrips in most flowers.",
              priority: "HIGH",
              type: "DISEASE",
            },
          },
          { name: "Cotton Field", soilType: "Black (regur)", crop: "cotton", planted: "2026-06-15", method: "flood", pumpFlowLpm: 450, pumpPowerKw: 3.7, offset: [-0.0006, 0.0006], size: [0.0011, 0.0013] },
        ],
      },
    ],
  },
  {
    email: "advisor@agriguard.in",
    name: "Dr. Meera Patil",
    role: "AGRONOMIST",
    phone: "9123456780",
    language: "en",
    summary: "Agronomist: advises Ravi, Sunita and Lakshmi; joins Pawar Farms with its share code",
    farms: [],
  },
  {
    email: "fpo@agriguard.in",
    name: "Prakash Joshi",
    role: "ADMIN",
    phone: "9000000006",
    language: "en",
    summary: "FPO coordinator (admin): sees every farm on one desk",
    farms: [],
  },
];

// Resets a demo account to a known state (profile, password and alert settings).
async function upsertUser(account: DemoAccount) {
  const values = {
    name: account.name,
    role: account.role,
    phone: account.phone,
    language: account.language,
    passwordHash: await bcrypt.hash(password, 12),
    smsAlerts: false,
    whatsappAlerts: false,
    pushAlerts: true,
    dailyBriefing: false,
  };
  const existing = await db.orm.public.User.where({ email: account.email }).first();
  if (existing) return (await db.orm.public.User.where({ id: existing.id }).update(values))!;
  return db.orm.public.User.create({ email: account.email, ...values });
}

async function removeOldDemo(userId: number) {
  const { deleteFieldCascade } = await import("../src/services/field.service.js");
  const old = await db.orm.public.Farm.where({ ownerId: userId }).all();
  for (const farm of old) {
    const fields = await db.orm.public.Field.where({ farmId: farm.id }).all();
    for (const field of fields) await deleteFieldCascade(field.id);
    await db.orm.public.Trial.where({ farmId: farm.id }).deleteAndCount();
    await db.orm.public.FarmAdvisor.where({ farmId: farm.id }).deleteAndCount();
    await db.orm.public.Farm.where({ id: farm.id }).delete();
  }
  await db.orm.public.FarmAdvisor.where({ advisorId: userId }).deleteAndCount();
  await db.orm.public.Notification.where({ userId }).deleteAndCount();
  await db.orm.public.ChatMessage.where({ userId }).deleteAndCount();
}

function rectangle(center: [number, number], offset: [number, number], size: [number, number]): LatLng[] {
  const lat = center[0] + offset[0];
  const lng = center[1] + offset[1];
  return [
    [lat + size[0] / 2, lng - size[1] / 2],
    [lat + size[0] / 2, lng + size[1] / 2],
    [lat - size[0] / 2, lng + size[1] / 2],
    [lat - size[0] / 2, lng - size[1] / 2],
  ];
}

// Records the clearest Sentinel-2 scene in each of the last few windows, oldest first, so each field has a real greenness trend.
async function recordNdviHistory(owner: AuthUser, fieldId: number) {
  const values: string[] = [];
  for (let window = ndviWindows - 1; window >= 0; window -= 1) {
    const until = window === 0 ? undefined : new Date(Date.now() - window * ndviWindowDays * 86400000);
    try {
      const snapshot = await refreshNdvi(owner, fieldId, until ? { until, lookbackDays: ndviWindowDays } : {});
      values.push(`${snapshot.sceneDate.slice(5, 10)} ${snapshot.meanNdvi.toFixed(2)}`);
    } catch {
      values.push("cloudy");
    }
  }
  return values.join(", ");
}

async function main() {
  const users = new Map<string, Awaited<ReturnType<typeof upsertUser>>>();
  for (const account of accounts) {
    const user = await upsertUser(account);
    await removeOldDemo(user.id);
    users.set(account.email, user);
  }
  const authFor = (email: string): AuthUser => {
    const user = users.get(email)!;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  };
  const advisor = users.get("advisor@agriguard.in")!;
  const createdFields: Array<{ id: number; name: string; spec: FieldSpec; farmId: number; owner: string }> = [];
  const shareCodes: Array<{ farm: string; code: string }> = [];

  for (const account of accounts) {
    for (const spec of account.farms) {
      const farm = await db.orm.public.Farm.create({
        name: spec.name,
        location: spec.location,
        description: spec.description,
        ownerId: users.get(account.email)!.id,
        latitude: spec.center[0],
        longitude: spec.center[1],
        irrigationMethod: spec.method,
        solarCapacityKw: spec.solarCapacityKw,
        electricityRate: spec.electricityRate,
        shareCode: spec.shared ? shareCode() : null,
      });
      if (spec.advised) await db.orm.public.FarmAdvisor.create({ farmId: farm.id, advisorId: advisor.id });
      if (farm.shareCode) shareCodes.push({ farm: farm.name, code: farm.shareCode });

      for (const fieldSpec of spec.fields) {
        const boundary = rectangle(spec.center, fieldSpec.offset, fieldSpec.size);
        const [latitude, longitude] = polygonCentroid(boundary);
        const field = await db.orm.public.Field.create({
          farmId: farm.id,
          name: fieldSpec.name,
          area: round(acresFromPolygon(boundary), 2),
          soilType: fieldSpec.soilType,
          location: spec.location,
          latitude,
          longitude,
          boundary: JSON.stringify(boundary),
          irrigationMethod: fieldSpec.method,
          pumpFlowLpm: fieldSpec.pumpFlowLpm,
          pumpPowerKw: fieldSpec.pumpPowerKw,
          solarPreferred: Boolean(fieldSpec.solar),
        });
        const profile = getCrop(fieldSpec.crop)!;
        await db.orm.public.Crop.create({
          fieldId: field.id,
          cropType: profile.key,
          name: profile.name,
          season: fieldSpec.season ?? "Kharif 2026",
          plantingDate: new Date(`${fieldSpec.planted}T06:00:00+05:30`).toISOString(),
          status: "ACTIVE",
        });
        const readings = skipNetwork ? 0 : await syncOpenMeteoReadings(field.id, historyDays);
        console.log(`  ${spec.name} / ${fieldSpec.name}: ${field.area} acres, ${readings} hourly Open-Meteo readings`);
        createdFields.push({ id: field.id, name: fieldSpec.name, spec: fieldSpec, farmId: farm.id, owner: account.email });
      }
    }
  }

  const fieldNamed = (name: string) => createdFields.find((field) => field.name === name)!;
  const east = fieldNamed("East Plot");
  const south = fieldNamed("South Field (control)");
  await db.orm.public.Trial.create({
    farmId: east.farmId,
    name: "Soybean: AgriGuard vs usual flooding",
    treatmentFieldId: east.id,
    controlFieldId: south.id,
    startDate: new Date().toISOString(),
    notes: "Same soil, crop and sowing date. East Plot follows AgriGuard's advice; South Field keeps the farmer's weekly flood. Results appear once both plots have metered pump runs.",
  });

  if (!skipNetwork) {
    try {
      const north = fieldNamed("North Field");
      const leaf = readFileSync(resolve(import.meta.dirname, "../../frontend/public/images/scan-sample-leaf.jpg"));
      const scan = await createScan(authFor(north.owner), { fieldId: north.id, cropKey: "tomato", language: "en" }, { buffer: leaf, originalName: "tomato-leaf.jpg", mimeType: "image/jpeg" });
      console.log("  leaf scan:", scan.top?.name, Math.round((scan.top?.confidence ?? 0) * 100) + "%");
    } catch (error) {
      console.log("  leaf scan skipped:", (error as Error).message);
    }
    for (let index = 0; index < createdFields.length; index += 3) {
      const batch = createdFields.slice(index, index + 3);
      const trends = await Promise.all(batch.map((field) => recordNdviHistory(authFor(field.owner), field.id)));
      batch.forEach((field, position) => console.log(`  NDVI ${field.name}: ${trends[position]}`));
    }
  }

  for (const field of createdFields) {
    if (field.spec.advisorNote) await addAdvisorNote(authFor(advisor.email), field.id, field.spec.advisorNote);
  }

  for (const field of createdFields) await syncFieldLedger(field.id);
  for (const field of createdFields) await analyzeField(field.id, { trigger: "seed" });

  console.log(`\nDemo ready. Every account uses the password ${password}`);
  for (const account of accounts) console.log(`  ${account.email.padEnd(22)} ${account.summary}`);
  for (const entry of shareCodes) console.log(`  Share code for ${entry.farm}: ${entry.code}`);
  console.log("  Readings refresh from Open-Meteo every 30 minutes while the backend runs.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
