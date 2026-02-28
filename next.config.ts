import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["oracledb", "typeorm"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // oracledb requires native bindings — keep it server-side only
      config.externals = [...(config.externals || []), "oracledb"];
    }
    return config;
  },
};

export default nextConfig;
