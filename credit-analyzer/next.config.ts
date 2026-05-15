import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // pdf.js requires canvas as optional dep — alias to empty module in browser
      canvas: "./public/empty.js",
    },
  },
}

export default nextConfig
