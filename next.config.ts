import type { NextConfig } from "next";

const nextConfig: NextConfig = {
<<<<<<< HEAD
  // Lighthouse resolves audit modules dynamically at runtime. Keep it in the
  // Node.js module graph instead of asking Turbopack to statically bundle it.
  serverExternalPackages: ["lighthouse", "chrome-launcher"],
=======
  /* config options here */
>>>>>>> 5d20e0b (Initial commit from Create Next App)
};

export default nextConfig;
