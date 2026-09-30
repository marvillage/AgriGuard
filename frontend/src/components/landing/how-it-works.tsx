import { BrainCircuit, ChartColumn, Radio, Power } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const steps = [
  {
    icon: Radio,
    title: "Sense",
    body: "Satellite images and the Open-Meteo soil model cover every field today. The solar field node, designed and ready to build, adds soil and NPK readings every minute.",
  },
  {
    icon: BrainCircuit,
    title: "Predict",
    body: "AI combines readings with the local forecast to predict water stress, disease risk and nutrient gaps.",
  },
  {
    icon: Power,
    title: "Act",
    body: "Your phone says when to start and stop the pump and logs each watering. With the field node, the pump switches itself.",
  },
  {
    icon: ChartColumn,
    title: "Measure",
    body: "Every skipped cycle is logged as litres, kWh, CO₂ and ₹ saved, so impact is proven, not claimed.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-20 overflow-hidden bg-slate-50 py-24 lg:py-32">
      <div className="bg-aurora-light absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-widest text-sun-600 uppercase">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            From monitoring to prediction to automation
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Four steps run on a loop, every day, on every field.
          </p>
        </Reveal>

        <div className="relative mt-16">
          <div className="absolute top-15 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-sun-300 via-navy-300 to-sun-300 lg:block" aria-hidden="true" />
          <ol className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, body }, index) => (
              <Reveal as="li" key={title} delay={index * 110} className="relative">
                <div className="group h-full rounded-3xl border border-slate-200/80 bg-white p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-950 text-sun-400 transition-colors duration-300 group-hover:bg-sun-400 group-hover:text-ink">
                      <Icon className="h-7 w-7" />
                    </span>
                    <span className="font-display text-5xl font-bold text-slate-100 transition-colors group-hover:text-sun-100">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-xl font-bold text-ink">{title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
