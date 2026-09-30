import Link from "next/link";
import {
  ArrowRight,
  CloudRain,
  Droplets,
  CirclePlay,
  Sprout,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ImageSlot } from "@/components/ui/image-slot";
import { siteImages } from "@/lib/site-images";
import { formatIndian, kwhPerKilolitre } from "@/lib/impact";

const heroStats = [
  { value: "~30%", label: "less irrigation water on flood-irrigated paddy (PAU, alternate wetting & drying)" },
  { value: `${formatIndian(kwhPerKilolitre, 1)} kWh`, label: "pump energy saved per 1,000 L not lifted" },
  { value: "₹0", label: "extra hardware to start: satellite, the Open-Meteo soil model and the phone you already have" },
];

export function Hero() {
  return (
    <ImageSlot image={siteImages.hero} eager className="bg-ink">
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-navy-950/90 to-navy-950/40" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" aria-hidden="true" />
      <div className="absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-sun-400/15 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pt-32 pb-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:pt-40 lg:pb-28">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-sun-400/30 bg-sun-400/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-sun-300">
            <Sprout className="h-3.5 w-3.5" />
            Smart Agriculture · AI + satellite
          </span>

          <h1 className="mt-6 max-w-2xl font-display text-4xl leading-[1.08] font-bold tracking-tight text-balance-safe text-white sm:text-5xl lg:text-6xl">
            Every drop <span className="text-sun-400">measured.</span>
            <br />
            Every field protected.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            AgriGuard combines satellite images, the local weather and a soil
            model for every field, then tells you exactly when to run the pump —
            and when to wait.
            Less water, less power and less fertilizer, with every saving
            counted in litres, kWh and rupees.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how" className={buttonVariants({ size: "lg", variant: "light" })}>
              <CirclePlay className="h-4 w-4" /> See how it works
            </a>
          </div>

          <dl className="mt-14 grid max-w-2xl gap-6 border-t border-white/10 pt-8 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-2xl font-bold text-white">
                  {stat.value}
                </dd>
                <dd className="mt-1 text-sm leading-snug text-white/55">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative hidden lg:block">
          <LiveFieldCard />
        </div>
      </div>
    </ImageSlot>
  );
}

// Real cropland near Nashik (the demo farm); values come live from Open-Meteo, refreshed every 30 minutes.
const liveSpot = { name: "Nashik, Maharashtra", latitude: 20.0264, longitude: 73.9065 };

async function loadLiveSpot() {
  const params = new URLSearchParams({
    latitude: String(liveSpot.latitude),
    longitude: String(liveSpot.longitude),
    hourly: "soil_moisture_9_to_27cm,precipitation,precipitation_probability",
    daily: "et0_fao_evapotranspiration",
    past_days: "1",
    forecast_days: "2",
    timezone: "Asia/Kolkata",
    timeformat: "unixtime",
  });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 1800 } });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      hourly: { time: number[]; soil_moisture_9_to_27cm: Array<number | null>; precipitation: Array<number | null>; precipitation_probability: Array<number | null> };
      daily: { et0_fao_evapotranspiration: Array<number | null> };
    };
    const now = Date.now() / 1000;
    const past = body.hourly.time.map((time, index) => ({ time, index })).filter((hour) => hour.time <= now - 3600);
    const latest = past[past.length - 1];
    const next = body.hourly.time.map((time, index) => ({ time, index })).filter((hour) => hour.time > now && hour.time <= now + 86400);
    const moisture = latest ? body.hourly.soil_moisture_9_to_27cm[latest.index] : null;
    if (!latest || moisture === null || moisture === undefined) return null;
    return {
      moisture: moisture * 100,
      measuredAt: latest.time * 1000,
      rainMm: next.reduce((total, hour) => total + (body.hourly.precipitation[hour.index] ?? 0), 0),
      rainChance: Math.max(0, ...next.map((hour) => body.hourly.precipitation_probability[hour.index] ?? 0)),
      et0: body.daily.et0_fao_evapotranspiration[1] ?? null,
    };
  } catch {
    return null;
  }
}

async function LiveFieldCard() {
  const live = await loadLiveSpot();
  const time = live
    ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(live.measuredAt)
    : null;
  // Same rule the irrigation engine uses: wait when at least 5 mm is forecast with a 60% or higher chance.
  const rainWillHelp = live ? live.rainMm >= 5 && live.rainChance >= 60 : false;

  return (
    <div className="animate-float">
      <div className="animate-fade-up rounded-3xl border border-white/15 bg-white/10 p-6 text-white shadow-lift backdrop-blur-xl [animation-delay:200ms]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-white/50 uppercase">Live data · Open-Meteo</p>
            <p className="mt-1 font-display text-lg font-semibold">{liveSpot.name}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-emerald-300" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Live
          </span>
        </div>

        {live ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Reading icon={Droplets} label="Soil moisture, 9–27 cm" value={`${live.moisture.toFixed(1)}%`} hint={`Modelled, ${time}`} />
              <Reading icon={CloudRain} label="Rain, next 24 h" value={`${live.rainMm.toFixed(1)} mm`} hint={`Up to ${Math.round(live.rainChance)}% chance`} />
            </div>

            <div className="mt-3 rounded-2xl bg-sun-400 p-4 text-ink">
              <p className="text-xs font-bold tracking-wide uppercase opacity-70">What AgriGuard would do</p>
              <p className="mt-1 font-display font-semibold">
                {rainWillHelp ? "Hold the pump: forecast rain covers today's need." : "No useful rain due: irrigate only below the refill point."}
              </p>
            </div>

            {live.et0 !== null ? (
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-white/70">
                  <Zap className="h-4 w-4 text-sun-400" /> Reference crop water use today (ET₀)
                </span>
                <span className="font-semibold">{live.et0.toFixed(1)} mm</span>
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-6 rounded-2xl border border-white/10 bg-ink/40 p-4 text-sm text-white/70">
            Live weather is unavailable right now. Open the dashboard for your own fields.
          </p>
        )}
      </div>
    </div>
  );
}

function Reading({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <Icon className="h-4 w-4 text-sun-300" />
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-white/60">{label}</p>
      <p className="mt-0.5 text-[11px] text-white/40">{hint}</p>
    </div>
  );
}
