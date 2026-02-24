import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
});

const nextConfig: NextConfig = {
  // Required for Netlify to bypass Next 15's default Turbopack build assertion
  // when using Webpack-based plugins like next-pwa.
  turbopack: {},
};

export default withPWA(nextConfig);
