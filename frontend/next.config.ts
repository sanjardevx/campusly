import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The repo already has CLAUDE.md; do not generate AGENTS.md on `next dev`
  agentRules: false,
  // Bundle MUI's Next.js integration together with MUI on the server. Otherwise Turbopack loads it
  // as an external module with its own Emotion copy, and the SSR style cache is ignored (hydration mismatch).
  transpilePackages: ["@mui/material-nextjs"],
};

export default nextConfig;
