import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "AgriGuard: Smart irrigation & crop intelligence",
    short_name: "AgriGuard",
    description: "Soil sensors, weather and AI that save water, energy and fertilizer on every field.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0a1433",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Crop scan", url: "/scan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Pump controller", url: "/phone/pump", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Walk your field", url: "/phone/walk", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Measure pump flow", url: "/phone/flow", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
