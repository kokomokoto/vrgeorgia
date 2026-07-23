import type { NextConfig } from "next";

// standalone — მხოლოდ ცალკე Render სერვისისთვის; merged deploy → Express (backend/src/tourUiServer.js)
const useStandalone = process.env.TOUR_UI_STANDALONE === "1";

const tourFrameAncestors =
  "frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000 https://vrgeorgia.ge https://www.vrgeorgia.ge https://vhome.ge https://www.vhome.ge https://vrgeorgia-frontend.onrender.com https://vrgeorgia-api.onrender.com";

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  serverExternalPackages: ["better-sqlite3", "sharp"],
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/v/:path*",
        headers: [
          { key: "Content-Security-Policy", value: tourFrameAncestors },
        ],
      },
    ];
  },
};

export default nextConfig;
