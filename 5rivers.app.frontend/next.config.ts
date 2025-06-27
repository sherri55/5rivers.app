import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use src/app as the app directory
  experimental: {},
  // Explicitly allow your production domain for cross-origin requests
  // allowedDevOrigins: ["localhost:9999","5riverstruckinginc.ca"],
  // Optionally, add more config options as needed
};

console.log('NEXT_PUBLIC_API_URL at build:', process.env.NEXT_PUBLIC_API_URL);

export default nextConfig;
