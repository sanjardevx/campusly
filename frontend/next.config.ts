import type { NextConfig } from "next";
import i18nConfig from "./next-i18next.config.js";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Locale routing (/uz/..., /ru/..., /ko/...); the list lives in next-i18next.config.js
  i18n: i18nConfig.i18n,
  // The repo already has CLAUDE.md; do not generate AGENTS.md on `next dev`
  agentRules: false,
  // Bundle MUI's Next.js integration together with MUI on the server. Otherwise Turbopack loads it
  // as an external module with its own Emotion copy, and the SSR style cache is ignored (hydration mismatch).
  transpilePackages: ["@mui/material-nextjs"],
  // Dynamic pages ([courseId], fallback 'blocking') read the translation JSON on Vercel's server at
  // their first visit; files read with fs are not traced by themselves, so ship them explicitly.
  outputFileTracingIncludes: {
    "/**/*": ["./public/locales/**/*"],
  },
};

export default nextConfig;
