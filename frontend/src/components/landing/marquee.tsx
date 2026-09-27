import { Sprout } from "lucide-react";

const items = [
  "Smart irrigation",
  "Soil monitoring",
  "Crop health AI",
  "Rain-aware scheduling",
  "Fertilizer optimization",
  "Solar pump control",
  "Farm energy tracking",
  "Measured impact",
];

export function Marquee() {
  const loop = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-sun-500/40 bg-sun-400 py-4" aria-label="Capabilities">
      <div className="flex w-max animate-marquee gap-10 hover:[animation-play-state:paused]">
        {loop.map((item, index) => (
          <span
            key={`${item}-${index}`}
            aria-hidden={index >= items.length}
            className="flex items-center gap-10 font-display text-sm font-semibold tracking-wide whitespace-nowrap text-ink uppercase"
          >
            {item}
            <Sprout className="h-4 w-4 text-navy-900" />
          </span>
        ))}
      </div>
    </div>
  );
}
