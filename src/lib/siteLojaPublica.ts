import { MAINTENANCE_MODE } from "@/lib/siteMaintenance";

const CACHE_MS = 20_000;

let cached: { publica: boolean; expiresAt: number } | null = null;

export function clearLojaPublicaCache(): void {
  cached = null;
}

/** Leitura leve para o proxy (cache ~20s por instância). */
export async function isLojaPublica(): Promise<boolean> {
  if (cached && Date.now() < cached.expiresAt) {
    return cached.publica;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return true;
  }

  try {
    const endpoint = new URL(`${url}/rest/v1/site_layout`);
    endpoint.searchParams.set("id", "eq.default");
    endpoint.searchParams.set("select", "loja_publica");

    const res = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return true;
    }

    const rows = (await res.json()) as { loja_publica?: boolean }[];
    const publica = rows[0]?.loja_publica !== false;
    cached = { publica, expiresAt: Date.now() + CACHE_MS };
    return publica;
  } catch {
    return true;
  }
}

/** Env `NEXT_PUBLIC_MAINTENANCE_MODE` força manutenção; senão usa o flag no Supabase. */
export async function isSiteInMaintenanceMode(): Promise<boolean> {
  if (MAINTENANCE_MODE) return true;
  return !(await isLojaPublica());
}