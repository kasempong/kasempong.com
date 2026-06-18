import type { NextConfig } from "next"
const nextConfig: NextConfig = {
  turbopack: { resolveAlias: { canvas: "./public/empty.js" } },
}
export default nextConfig
