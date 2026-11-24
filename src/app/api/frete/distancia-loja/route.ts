import { getStorePickupAddress } from "@/config/storePickupAddress";
import { lookupCep } from "@/features/endereco/services/lookupCep";

/**
 * Distância aproximada (em linha reta) entre o CEP do cliente e a loja de retirada.
 * Geocodifica com o Nominatim (OpenStreetMap); resultados ficam em cache por 1 dia.
 */

type Coords = { lat: number; lon: number };

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const UA = "accorsi-loja/1.0 (calculo de distancia para retirada)";

async function geocode(params: Record<string, string>): Promise<Coords | null> {
  const qs = new URLSearchParams({ format: "json", limit: "1", countrycodes: "br", ...params });
  const res = await fetch(`${NOMINATIM}?${qs}`, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { lat?: string; lon?: string }[];
  const first = data[0];
  if (!first?.lat || !first?.lon) return null;
  const lat = Number(first.lat);
  const lon = Number(first.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

/** Tenta do mais preciso (rua) ao menos preciso (cidade). */
async function geocodeAddress(a: { logradouro: string; numero?: string; cidade: string; uf: string }) {
  const street = [a.numero, a.logradouro].filter(Boolean).join(" ");
  if (street) {
    const r = await geocode({ street, city: a.cidade, state: a.uf });
    if (r) return r;
  }
  return geocode({ city: a.cidade, state: a.uf });
}

function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function GET(request: Request) {
  const loja = getStorePickupAddress();
  if (!loja) return Response.json({ error: "Retirada indisponível." }, { status: 404 });

  const cep = new URL(request.url).searchParams.get("cep")?.replace(/\D/g, "") ?? "";
  if (cep.length !== 8) return Response.json({ error: "CEP inválido." }, { status: 400 });

  try {
    const cliente = await lookupCep(cep);
    if (!cliente || !cliente.cidade) return Response.json({ error: "CEP não encontrado." }, { status: 404 });

    const [origem, destino] = await Promise.all([geocodeAddress(loja), geocodeAddress(cliente)]);
    if (!origem || !destino) return Response.json({ error: "Não foi possível localizar." }, { status: 502 });

    const km = Math.round(haversineKm(origem, destino) * 10) / 10;
    return Response.json(
      { km, mesmaCidade: cliente.cidade.toLowerCase() === loja.cidade.toLowerCase() },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch {
    return Response.json({ error: "Falha ao calcular distância." }, { status: 502 });
  }
}
