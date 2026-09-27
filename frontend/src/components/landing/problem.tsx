import { Droplets, Gauge, Zap } from "lucide-react";
import { ImageSlot } from "@/components/ui/image-slot";
import { Reveal } from "@/components/ui/reveal";
import { formatIndian, kwhPerKilolitre } from "@/lib/impact";
import { siteImages } from "@/lib/site-images";

const facts = [
  {
    icon: Droplets,
    value: "~70%",
    label: "of the world's freshwater withdrawals go to agriculture (FAO).",
  },
  {
    icon: Gauge,
    value: "30–50%",
    label: "of flood-irrigation water is actually used by the crop (ICAR). The rest is lost to runoff, percolation and evaporation.",
  },
  {
    icon: Zap,
    value: `${formatIndian(kwhPerKilolitre, 1)} kWh`,
    label: "to lift every 1,000 L from a 30 m borewell. Wasted water is wasted power.",
  },
];

export function Problem() {
  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <ImageSlot
            image={siteImages.problem}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[4/3] rounded-3xl shadow-lift"
          />
        </Reveal>

        <div>
          <Reveal>
            <p className="text-sm font-semibold tracking-widest text-sun-600 uppercase">
              The problem
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight font-bold tracking-tight text-ink sm:text-4xl">
              Farms don&apos;t waste water on purpose.
              <span className="text-navy-700"> They just can&apos;t see the soil.</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Most pumps run on a timer, a habit or a hunch. Nobody knows how
              wet the root zone really is, whether rain is coming, or how much
              diesel and electricity each watering burns, so fields get too
              much water, too much fertilizer, and disease is spotted late.
            </p>
          </Reveal>

          <div className="mt-10 space-y-4">
            {facts.map(({ icon: Icon, value, label }, index) => (
              <Reveal key={value} delay={index * 90}>
                <div className="flex gap-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-sun-300 hover:shadow-lift">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-sun-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-2xl font-bold text-ink">{value}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{label}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
