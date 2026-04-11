import type { NextConfig } from "next";
import path from "node:path";

function supabaseImageRemotePattern(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return [];
  try {
    const u = new URL(raw);
    return [
      {
        protocol: u.protocol.replace(":", "") as "http" | "https",
        hostname: u.hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: supabaseImageRemotePattern(),
  },
};

export default nextConfig;
