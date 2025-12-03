import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 60, // seconds (default is 60 days!)
  },
  /* config options here */
};

export default nextConfig;
