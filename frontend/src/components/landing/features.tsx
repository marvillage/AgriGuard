import {
  CloudSun,
  Droplets,
  FlaskConical,
  ScanLine,
  SolarPanel,
  Thermometer,
} from "lucide-react";
import { ImageSlot } from "@/components/ui/image-slot";
import { Reveal } from "@/components/ui/reveal";
import { siteImages, type SiteImage } from "@/lib/site-images";
import { cn } from "@/lib/utils";

const features: {
  icon: typeof Droplets;
  title: string;
  body: string;
  image: SiteImage;
  wide?: boolean;
}[] = [
  {
    icon: Droplets,
    title: "Smart irrigation",
    body: "Rain-aware watering advice. Water only when the root zone needs it, and skip the cycle when the forecast will do it for free. Your phone tells you when to start and stop the pump.",
    image: siteImages.irrigation,
    wide: true,
  },
  {
    icon: Thermometer,
    title: "Soil monitoring",
    body: "Soil moisture and temperature for every field from the Open-Meteo soil model, and NPK from your Soil Health Card.",
    image: siteImages.soil,
  },
  {
    icon: ScanLine,
    title: "Crop health scan",
    body: "Snap a leaf. AI flags disease early with treatment steps.",
    image: siteImages.cropScan,
  },
  {
    icon: CloudSun,
    title: "Weather intelligence",
    body: "Hyper-local forecasts decide whether today is a watering day.",
    image: siteImages.weather,
  },
  {
    icon: FlaskConical,
    title: "Fertilizer optimization",
    body: "Right nutrient, right dose, right zone. No blanket spreading.",
    image: siteImages.fertilizer,
  },
  {
    icon: SolarPanel,
    title: "Solar & farm energy",
    body: "Shift pump hours into solar peaks and track every kWh the farm uses and saves.",
    image: siteImages.solarPump,
    wide: true,
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-widest text-sun-600 uppercase">
              Features
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              One platform for the whole precision-farming loop
            </h2>
          </div>
          <p className="max-w-md text-lg text-slate-600">
            Hardware in the field, AI in the cloud, and a dashboard any farmer
            can read at a glance.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body, image, wide }, index) => (
            <Reveal
              key={title}
              delay={(index % 3) * 90}
              className={cn(wide && "lg:col-span-2")}
            >
              <article className="group relative h-full min-h-80 overflow-hidden rounded-3xl bg-navy-950 shadow-soft transition-shadow duration-300 hover:shadow-lift">
                <ImageSlot
                  image={image}
                  sizes={wide ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 100vw"}
                  className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-transparent" aria-hidden="true" />
                <div className="relative flex h-full flex-col justify-end p-6 text-white">
                  <span className="mb-auto flex h-11 w-11 items-center justify-center rounded-xl bg-sun-400 text-ink shadow-glow transition-transform duration-300 group-hover:-translate-y-0.5">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-16 font-display text-xl font-bold">{title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
                    {body}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
