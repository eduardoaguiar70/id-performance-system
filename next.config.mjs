/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Reduce bundle size by only importing what's used from these packages
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "date-fns",
      "recharts",
    ],
  },

  // Turbopack for faster dev builds (Next 15+ / latest Next 14 canary)
  // Remove this line if it causes issues on your Next version
  // turbopack: {},
};

export default nextConfig;
