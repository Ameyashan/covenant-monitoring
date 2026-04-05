import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase body size limit for PDF uploads via Server Actions.
  // Note: Route Handler body size is controlled by the underlying platform
  // (e.g. Vercel 4.5 MB serverless limit). For larger PDFs consider the
  // Anthropic Files API to upload once and reuse by file_id.
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
