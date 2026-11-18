import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

function supabaseImageRemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) {
    return [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }];
  }
  try {
    const { protocol, hostname, port } = new URL(raw);
    return [
      {
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
        ...(port ? { port } : {}),
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }];
  }
}

/**
 * Baseline CSP — tighten over time (nonces/hashes for scripts, narrow img-src/connect-src).
 * Dev allows eval + local ws/http for Next.js HMR.
 */
function contentSecurityPolicy(): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'"
    : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'";
  const connectDev =
    " http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*";
  const connectSrc = `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com https://staticimgly.com https://viacep.com.br https://brasilapi.com.br${
    isDev ? connectDev : ""
  }`;
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "worker-src 'self' blob:",
    connectSrc,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const securityHeaders: { key: string; value: string }[] = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
];

if (!isDev) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseImageRemotePatterns(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
