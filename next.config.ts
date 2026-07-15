import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: Vercel handles Next.js builds natively; "standalone" output is for self-hosted Bun.
  // output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Prisma needs to be bundled for serverless
  serverExternalPackages: ["@prisma/client", "@node-rs/argon2"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
