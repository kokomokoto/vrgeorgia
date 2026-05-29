import type { NextConfig } from "next";

// standalone — მხოლოდ ცალკე Render სერვისისთვის; merged deploy → Express (backend/src/tourUiServer.js)
const useStandalone = process.env.TOUR_UI_STANDALONE === "1";

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  serverExternalPackages: ["better-sqlite3", "sharp"],
  // StrictMode dev-ში effect-ებს ორჯერ უშვებს, რაც PhotoSphereViewer-ის
  // იმპერატიულ init/destroy-ს არღვევს (arrowsRenderer teardown race).
  reactStrictMode: false,
};

export default nextConfig;
