/** URL absoluta do Supabase (Storage) — elegível ao otimizador do `next/image` (`remotePatterns`). */
export function isSupabaseStorageUrl(src: string): boolean {
  try {
    const host = new URL(src).hostname;
    return host.endsWith(".supabase.co") || host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}
