/** @type {import('next').NextConfig} */
const BACKEND_BASE = (process.env.PROPERTIES_API_BASE ?? "https://api.thaiindustrialproperty.com").replace(/\/+$/, "");

const nextConfig = {
  // Demo-only: the exact QuickSearch filter calls the real backend option/
  // autocomplete endpoints. Proxy them so the browser keeps same-origin.
  // /api/ai-search stays local (defined in app/api/ai-search).
  async rewrites() {
    return [
      {
        source: "/api/options/:path*",
        destination: `${BACKEND_BASE}/api/options/:path*`,
      },
      {
        source: "/api/properties/autocomplete",
        destination: `${BACKEND_BASE}/api/properties/autocomplete`,
      },
    ];
  },
};

export default nextConfig;
