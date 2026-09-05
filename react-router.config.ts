import type { Config } from "@react-router/dev/config";

export default {
  // Server-side rendering. The app is behind authentication and renders
  // per-user content, so there is nothing to prerender.
  ssr: true,
} satisfies Config;
