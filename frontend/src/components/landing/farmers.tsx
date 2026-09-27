import { Bell, CircleCheck, MessageSquare, Smartphone } from "lucide-react";
import { ImageSlot } from "@/components/ui/image-slot";
import { Reveal } from "@/components/ui/reveal";
import { siteImages } from "@/lib/site-images";

const points = [
  {
    icon: MessageSquare,
    title: "Plain-language actions",
    body: "“Skip watering today, 72% chance of rain.” One clear step instead of a wall of charts.",
  },
  {
    icon: Bell,
    title: "Alerts before damage spreads",
    body: "Disease, heat and water-stress warnings arrive while there is still time to act.",
  },
  {
    icon: CircleCheck,
    title: "Every decision explained",
    body: "Each recommendation shows the readings and forecast behind it, so farmers can trust it.",
  },
  {
    icon: Smartphone,
    title: "Phone-first",
    body: "Scan a leaf, check a field or ask the AI copilot from any smartphone browser.",
  },
];

export function Farmers() {
  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div>
          <Reveal>
            <p className="text-sm font-semibold tracking-widest text-sun-600 uppercase">
              Built for farmers
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Precision farming that fits in a pocket
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {points.map(({ icon: Icon, title, body }, index) => (
              <Reveal key={title} delay={index * 80}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sun-100 text-sun-700">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 leading-relaxed text-slate-600">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={100} className="relative isolate">
          <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-sun-200 to-sun-400 opacity-60 blur-2xl" aria-hidden="true" />
          <ImageSlot
            image={siteImages.farmer}
            tone="light"
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="aspect-[4/5] rounded-[2rem] shadow-lift"
          />
        </Reveal>
      </div>
    </section>
  );
}
