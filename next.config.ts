import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lighthouse resolves audit modules dynamically at runtime. Keep it in the
  // Node.js module graph instead of asking Turbopack to statically bundle it.
  serverExternalPackages: ["lighthouse", "chrome-launcher", "puppeteer-core"],
};

export default nextConfig;
