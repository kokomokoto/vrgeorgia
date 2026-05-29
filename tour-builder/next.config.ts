import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp"],
  // StrictMode dev-ში effect-ებს ორჯერ უშვებს, რაც PhotoSphereViewer-ის
  // იმპერატიულ init/destroy-ს არღვევს (arrowsRenderer teardown race).
  reactStrictMode: false,
};

export default nextConfig;
