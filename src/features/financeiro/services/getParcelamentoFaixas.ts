import { cache } from "react";
import { unstable_cache } from "next/cache";

import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import {
  PARCELAMENTO_FAIXAS_PADRAO,
  sortParcelamentoFaixas,
  type ParcelamentoFaixa,
} from "@/features/produtos/utils/parcelamento";
import { createPublicClient } from "@/services/supabase/public";
import { createClient } from "@/services/supabase/server";

function mapRows(data: unknown): ParcelamentoFaixa[] | null {
  if (!Array.isArray(data)) return null;
  const faixas: ParcelamentoFaixa[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as { valor_minimo?: unknown; max_parcelas?: unknown };
    const valorMinimo = Number(row.valor_minimo);
    const maxParcelas = Number(row.max_parcelas);
    if (!Number.isFinite(valorMinimo) || !Number.isFinite(maxParcelas)) continue;
    faixas.push({ valorMinimo, maxParcelas });
  }
  return sortParcelamentoFaixas(faixas);
}

async function fetchPublicFaixas(): Promise<ParcelamentoFaixa[]> {
  try {
    const { data, error } = await createPublicClient()
      .from("parcelamento_faixas")
      .select("valor_minimo, max_parcelas")
      .order("valor_minimo", { ascending: true });
    if (error || !data) return PARCELAMENTO_FAIXAS_PADRAO;
    return mapRows(data) ?? PARCELAMENTO_FAIXAS_PADRAO;
  } catch {
    return PARCELAMENTO_FAIXAS_PADRAO;
  }
}

const getCachedParcelamentoFaixas = unstable_cache(fetchPublicFaixas, ["store-parcelamento-faixas"], {
  tags: [CATALOG_CACHE_TAGS.parcelamento],
  revalidate: 60 * 60,
});

/** Faixas da vitrine e do checkout (cache público; o admin invalida a tag ao salvar). */
export const getParcelamentoFaixas = cache(async function getParcelamentoFaixas(): Promise<ParcelamentoFaixa[]> {
  return getCachedParcelamentoFaixas();
});

/** Leitura direta no painel, sem cache. */
export async function getParcelamentoFaixasAdmin(): Promise<{
  faixas: ParcelamentoFaixa[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("parcelamento_faixas")
      .select("valor_minimo, max_parcelas")
      .order("valor_minimo", { ascending: true });
    if (error) {
      return { faixas: PARCELAMENTO_FAIXAS_PADRAO, error: error.message };
    }
    return { faixas: mapRows(data) ?? [], error: null };
  } catch (e) {
    return {
      faixas: PARCELAMENTO_FAIXAS_PADRAO,
      error: e instanceof Error ? e.message : "Erro ao carregar as faixas.",
    };
  }
}
