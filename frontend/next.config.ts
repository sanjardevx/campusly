import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The repo already has CLAUDE.md; do not generate AGENTS.md on `next dev`
  agentRules: false,
};

export default nextConfig;
