import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  // [portless](https://github.com/vercel-labs/portless): allow dev server when opened as https://openclaw-soul.localhost (and git-worktree subdomains).
  allowedDevOrigins: ["openclaw-soul.localhost", "*.openclaw-soul.localhost"],
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
