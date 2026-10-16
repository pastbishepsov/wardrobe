import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Гардероб",
    short_name: "Гардероб",
    description: "Личный гардероб: вещи, образы, примерка, капсулы на поездку",
    start_url: "/wardrobe",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f2ec",
    theme_color: "#f6f2ec",
    lang: "ru",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
