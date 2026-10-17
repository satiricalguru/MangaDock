import type { MetadataRoute } from "next";

// Lets phones install MangaDock to the home screen with its own icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MangaDock",
    short_name: "MangaDock",
    description: "Read manga, manhwa and manhua free, with no ads.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0712",
    theme_color: "#0b0712",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
