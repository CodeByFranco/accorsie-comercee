/**
 * URL pública do site (mesma regra que o checkout MP).
 */
export function resolvePublicAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    const withProtocol = /^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`;
    try {
      return new URL(withProtocol).origin;
    } catch {
      return withProtocol.replace(/\/+$/, "");
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return host.replace(/\/+$/, "");
  }
  return "";
}

export function buildPedidoAbsoluteUrl(pedidoId: string): string {
  const base = resolvePublicAppBaseUrl();
  const path = `/pedidos/${pedidoId}`;
  if (base) {
    return `${base}${path}`;
  }
  return path;
}
