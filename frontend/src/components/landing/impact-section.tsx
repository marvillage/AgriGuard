import { ImpactCalculator } from "@/components/impact/impact-calculator";
import { Reveal } from "@/components/ui/reveal";

const units = ["Litres saved", "kWh saved", "CO₂ reduced", "Fertilizer reduced", "₹ saved"];

export function ImpactSection() {
  return (
    <section id="impact" className="relative scroll-mt-20 bg-gradient-to-b from-sun-50 via-white to-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-widest text-sun-600 uppercase">
            Measured impact
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            See what your farm could save this season
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Move the slider. Every number comes from an explicit, open
            assumption, and in the dashboard the same maths runs on your
            field&apos;s live soil and weather data.
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {units.map((unit) => (
              <li
                key={unit}
                className="rounded-full border border-navy-100 bg-white px-3 py-1 text-xs font-semibold text-navy-800 shadow-soft"
              >
                {unit}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120} className="mt-14">
          <ImpactCalculator />
        </Reveal>
      </div>
    </section>
  );
}
