const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export const MAINTENANCE_MODE = TRUE_VALUES.has(
  (process.env.NEXT_PUBLIC_MAINTENANCE_MODE ?? "").trim().toLowerCase(),
);

const MAINTENANCE_BYPASS_PREFIXES = [
  "/_next",
  "/api/webhooks/mercadopago",
  "/api/cron/sincronizar-pedidos",
  "/em-construcao",
  "/login",
];

const MAINTENANCE_BYPASS_EXACT = new Set([
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

export function isMaintenanceBypassPath(pathname: string): boolean {
  if (!pathname.startsWith("/")) return false;
  if (MAINTENANCE_BYPASS_EXACT.has(pathname)) return true;
  if (/\.[a-z0-9]+$/i.test(pathname)) return true;
  return MAINTENANCE_BYPASS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
