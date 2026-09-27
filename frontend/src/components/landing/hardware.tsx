import {
  BatteryCharging,
  Cpu,
  Droplets,
  FlaskConical,
  Power,
  Thermometer,
} from "lucide-react";
import { ImageSlot } from "@/components/ui/image-slot";
import { Reveal } from "@/components/ui/reveal";
import { siteImages } from "@/lib/site-images";

const parts = [
  { icon: Cpu, name: "ESP32 controller", detail: "Wi-Fi uplink, deep-sleep between reads" },
  { icon: Droplets, name: "Capacitive moisture probe", detail: "Corrosion-resistant, root-zone depth" },
  { icon: Thermometer, name: "Temperature & humidity", detail: "Air and soil temperature sensors" },
  { icon: FlaskConical, name: "NPK soil sensor", detail: "RS485 probe for nitrogen, phosphorus, potassium" },
  { icon: BatteryCharging, name: "Solar + Li-ion power", detail: "Runs off-grid through the monsoon" },
  { icon: Power, name: "Pump relay", detail: "Switches the starter on the AI's decision" },
];

const billOfMaterials = [
  { item: "ESP32 board + enclosure", cost: 800 },
  { item: "Moisture, temp & humidity sensors", cost: 550 },
  { item: "Solar panel, charger & battery", cost: 550 },
  { item: "Relay module & wiring", cost: 250 },
];

const coreTotal = billOfMaterials.reduce((sum, row) => sum + row.cost, 0);

export function Hardware() {
  return (
    <section id="hardware" className="relative scroll-mt-20 overflow-hidden bg-navy-950 py-24 text-white lg:py-32">
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div className="absolute -bottom-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-sun-400/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
        <Reveal className="relative">
          <ImageSlot
            image={siteImages.fieldNode}
            tone="sun"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-square rounded-[2rem] shadow-lift"
          />
          <div className="absolute -right-3 top-10 hidden animate-float rounded-2xl border border-white/15 bg-navy-900/80 px-4 py-3 shadow-lift backdrop-blur sm:block">
            <p className="text-xs text-white/50">Refresh rate</p>
            <p className="font-display font-semibold">Every 15 min</p>
          </div>
          <div className="absolute bottom-10 -left-3 hidden animate-float rounded-2xl bg-sun-400 px-4 py-3 text-ink shadow-glow [animation-delay:1.5s] sm:block">
            <p className="text-xs font-medium opacity-70">Core build cost</p>
            <p className="font-display font-bold">≈ ₹{coreTotal.toLocaleString("en-IN")}</p>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="text-sm font-semibold tracking-widest text-sun-400 uppercase">
              Hardware
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              The AgriGuard Field Node
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/65">
              A low-cost, solar-powered sensor box that lives in the field,
              talks to the cloud and can switch the pump. It&apos;s built from
              off-the-shelf parts, so it&apos;s easy to repair and cheap to scale.
            </p>
          </Reveal>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {parts.map(({ icon: Icon, name, detail }, index) => (
              <Reveal as="li" key={name} delay={index * 60}>
                <div className="flex h-full gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-sun-400/40 hover:bg-white/[0.07]">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-sun-400" />
                  <div>
                    <p className="font-semibold">{name}</p>
                    <p className="mt-0.5 text-sm text-white/55">{detail}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={120}>
            <div className="mt-6 rounded-2xl border border-white/10 bg-ink/40 p-5">
              <p className="text-sm font-semibold text-white/80">Indicative bill of materials</p>
              <dl className="mt-3 space-y-2 text-sm">
                {billOfMaterials.map((row) => (
                  <div key={row.item} className="flex justify-between gap-4">
                    <dt className="text-white/55">{row.item}</dt>
                    <dd className="tabular-nums">₹{row.cost.toLocaleString("en-IN")}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-white/10 pt-2 font-semibold">
                  <dt>Core node</dt>
                  <dd className="text-sun-400 tabular-nums">₹{coreTotal.toLocaleString("en-IN")}</dd>
                </div>
                <div className="flex justify-between gap-4 text-white/55">
                  <dt>Optional NPK probe</dt>
                  <dd className="tabular-nums">+ ₹3,500</dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
