"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import {
  PARCELAS_SEM_JUROS_MAX,
  PARCELAS_SEM_JUROS_MIN,
  sortParcelamentoFaixas,
  type ParcelamentoFaixa,
} from "@/features/produtos/utils/parcelamento";
import { createClient } from "@/services/supabase/server";

export type SaveParcelamentoState = { ok: true; message: string } | { ok: false; message: string };

function parseFaixas(raw: string): { ok: true; faixas: ParcelamentoFaixa[] } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Formato inválido. Recarregue a página e tente de novo." };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, message: "Formato inválido. Recarregue a página e tente de novo." };
  }

  const faixas: ParcelamentoFaixa[] = [];
  const vistos = new Set<string>();

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item || typeof item !== "object") {
      return { ok: false, message: `A faixa ${i + 1} está inválida.` };
    }
    const row = item as { valorMinimo?: unknown; maxParcelas?: unknown };
    const valorMinimo = Math.round(Number(row.valorMinimo) * 100) / 100;
    const maxParcelas = Number(row.maxParcelas);
    if (!Number.isFinite(valorMinimo) || valorMinimo <= 0) {
      return { ok: false, message: `Informe um valor maior que zero na faixa ${i + 1}.` };
    }
    if (!Number.isInteger(maxParcelas) || maxParcelas < PARCELAS_SEM_JUROS_MIN || maxParcelas > PARCELAS_SEM_JUROS_MAX) {
      return {
        ok: false,
        message: `As parcelas da faixa ${i + 1} precisam ser um número inteiro de ${PARCELAS_SEM_JUROS_MIN} a ${PARCELAS_SEM_JUROS_MAX}.`,
      };
    }
    const chave = valorMinimo.toFixed(2);
    if (vistos.has(chave)) {
      return { ok: false, message: "Cada valor mínimo só pode aparecer uma vez." };
    }
    vistos.add(chave);
    faixas.push({ valorMinimo, maxParcelas });
  }

  return { ok: true, faixas: sortParcelamentoFaixas(faixas) };
}

export async function saveParcelamentoFaixas(
  _prev: SaveParcelamentoState | null,
  formData: FormData,
): Promise<SaveParcelamentoState> {
  await requireAdmin();

  const parsed = parseFaixas(String(formData.get("faixas_json") ?? ""));
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const rows = parsed.faixas.map((faixa) => ({
    valor_minimo: faixa.valorMinimo,
    max_parcelas: faixa.maxParcelas,
  }));

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("parcelamento_faixas")
      .upsert(rows, { onConflict: "valor_minimo" });
    if (upsertError) {
      return { ok: false, message: upsertError.message };
    }
  }

  const minimos = rows.map((row) => row.valor_minimo);
  const deleteQuery = supabase.from("parcelamento_faixas").delete();
  const { error: deleteError } =
    minimos.length === 0
      ? await deleteQuery.gt("valor_minimo", 0)
      : await deleteQuery.not("valor_minimo", "in", `(${minimos.join(",")})`);

  if (deleteError) {
    return { ok: false, message: deleteError.message };
  }

  updateTag(CATALOG_CACHE_TAGS.parcelamento);
  revalidatePath("/", "layout");
  revalidatePath("/admin/financeiro");

  return { ok: true, message: "Faixas de parcelamento salvas." };
}
