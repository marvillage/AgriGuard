import { API_URL } from "./api";

// Every photo slot on the site. Drop a file at the matching path in /public and it
// replaces the gradient placeholder automatically. See IMAGE_PROMPTS.md at the repo root.
export interface SiteImage {
  src: string;
  alt: string;
}

export const siteImages = {
  hero: {
    src: "/images/hero-farm.jpg",
    alt: "Golden-hour aerial view of green crop rows with drip irrigation lines and a solar-powered sensor pole",
  },
  problem: {
    src: "/images/problem-flood-irrigation.jpg",
    alt: "A field flooded with excess irrigation water while a diesel pump runs at midday",
  },
  irrigation: {
    src: "/images/feature-smart-irrigation.jpg",
    alt: "Close-up of a drip emitter releasing a single water droplet at the base of a young plant",
  },
  soil: {
    src: "/images/feature-soil-sensor.jpg",
    alt: "Capacitive soil moisture probe inserted into dark, moist soil next to seedlings",
  },
  cropScan: {
    src: "/images/feature-crop-scan.jpg",
    alt: "Farmer holding a smartphone up to a tomato leaf to scan it for disease",
  },
  weather: {
    src: "/images/feature-weather.jpg",
    alt: "Monsoon rain clouds rolling over farmland at dusk",
  },
  fertilizer: {
    src: "/images/feature-fertilizer.jpg",
    alt: "Measured fertilizer granules in a farmer's palm above a crop row",
  },
  solarPump: {
    src: "/images/feature-solar-pump.jpg",
    alt: "Solar panels powering a water pump beside an irrigation channel",
  },
  fieldNode: {
    src: "/images/hardware-field-node.jpg",
    alt: "The AgriGuard field node: a weatherproof sensor box with a small solar panel and soil probe",
  },
  farmer: {
    src: "/images/farmer-using-app.jpg",
    alt: "Smiling farmer in a field checking irrigation status on a phone",
  },
  cta: {
    src: "/images/cta-sunflower-field.jpg",
    alt: "Wide sunflower field under a clear blue sky",
  },
  auth: {
    src: "/images/auth-seedlings.jpg",
    alt: "Rows of young seedlings glowing in early morning light",
  },
  scanSample: {
    src: "/images/scan-sample-leaf.jpg",
    alt: "Tomato leaf showing brown concentric early blight lesions",
  },
  emptyFarm: {
    src: "/images/empty-farm.png",
    alt: "Illustration of an empty plot of land with a small sprout and a sensor pole",
  },
  farmCovers: [
    {
      src: "/images/farm-cover-1.jpg",
      alt: "Aerial view of a wheat field",
    },
    {
      src: "/images/farm-cover-2.jpg",
      alt: "Aerial view of vegetable rows with drip lines",
    },
    {
      src: "/images/farm-cover-3.jpg",
      alt: "Aerial view of green paddy terraces",
    },
  ],
} satisfies Record<string, SiteImage | SiteImage[]>;

export function farmCover(farmId: number) {
  const covers = siteImages.farmCovers;
  return covers[Math.abs(farmId) % covers.length];
}

// The farmer's own photo when there is one, otherwise a stock cover.
export function farmImage(farm: { id: number; name: string; photoKey: string | null }): SiteImage & { uploaded: boolean } {
  if (farm.photoKey) return { src: `${API_URL}/uploads/${farm.photoKey}`, alt: farm.name, uploaded: true };
  return { ...farmCover(farm.id), uploaded: false };
}
