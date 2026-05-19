import { anosParaFaixas, sortedUniqueInts } from "@/features/compatibilidade/utils/compatAnosRanges";

export type ParsedCompatRow = {
  modelo_id: string;
  ano_inicio: number;
  ano_fim: number;
};

export type ParseCompatResult =
  | { ok: true; rows: ParsedCompatRow[] }
  | { ok: false; message: string };

function parseAnosSelecionados(raw: unknown): number[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const nums: number[] = [];
  for (const v of raw) {
    const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
    if (Number.isNaN(n)) continue;
    nums.push(n);
  }
  return sortedUniqueInts(nums);
}

function pushFaixasForModelo(
  out: ParsedCompatRow[],
  modelo_id: string,
  anos: number[],
  lineLabel: number
): ParseCompatResult | null {
  if (anos.length === 0) {
    return {
      ok: false,
      message: `Na linha ${lineLabel}: selecione ao menos um ano para o modelo escolhido.`,
    };
  }
  for (const y of anos) {
    if (y < 1900 || y > 2100) {
      return {
        ok: false,
        message: `Na linha ${lineLabel}: os anos devem ficar entre 1900 e 2100.`,
      };
    }
  }
  for (const faixa of anosParaFaixas(anos)) {
    out.push({ modelo_id, ...faixa });
  }
  return null;
}

/** Lê o JSON enviado pelo fieldset de compatibilidade (uma linha por modelo + anos selecionados). */
export function parseCompatibilidadesJson(raw: string): ParseCompatResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, rows: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return { ok: false, message: "Formato inválido na compatibilidade. Recarregue a página e tente de novo." };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, message: "Compatibilidade inválida: esperado uma lista de linhas." };
  }

  const out: ParsedCompatRow[] = [];
  const seenModeloUi = new Set<string>();

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (item == null || typeof item !== "object") {
      return { ok: false, message: `Linha ${i + 1} da compatibilidade está inválida.` };
    }
    const o = item as Record<string, unknown>;
    const modelo_id = String(o.modelo_id ?? "").trim();
    const anosSel = parseAnosSelecionados(o.anos_selecionados);
    const ano_inicio_s = String(o.ano_inicio ?? "").trim();
    const ano_fim_s = String(o.ano_fim ?? "").trim();

    if (!modelo_id && (anosSel == null || anosSel.length === 0) && !ano_inicio_s && !ano_fim_s) {
      continue;
    }

    if (!modelo_id) {
      return {
        ok: false,
        message: `Na linha ${i + 1}: escolha o modelo ou deixe a linha toda vazia.`,
      };
    }

    if (seenModeloUi.has(modelo_id)) {
      return {
        ok: false,
        message: "Cada modelo só pode aparecer uma vez na lista. Remova duplicatas.",
      };
    }
    seenModeloUi.add(modelo_id);

    if (anosSel != null) {
      const err = pushFaixasForModelo(out, modelo_id, anosSel, i + 1);
      if (err) return err;
      continue;
    }

    if (!ano_inicio_s || !ano_fim_s) {
      return {
        ok: false,
        message: `Na linha ${i + 1}: selecione ao menos um ano para o modelo escolhido.`,
      };
    }

    const ano_inicio = Number.parseInt(ano_inicio_s, 10);
    const ano_fim = Number.parseInt(ano_fim_s, 10);
    if (Number.isNaN(ano_inicio) || Number.isNaN(ano_fim)) {
      return { ok: false, message: `Na linha ${i + 1}: anos devem ser números inteiros.` };
    }
    if (ano_inicio < 1900 || ano_inicio > 2100 || ano_fim < 1900 || ano_fim > 2100) {
      return { ok: false, message: `Na linha ${i + 1}: os anos devem ficar entre 1900 e 2100.` };
    }
    if (ano_inicio > ano_fim) {
      return { ok: false, message: `Na linha ${i + 1}: o ano inicial não pode ser maior que o ano final.` };
    }
    out.push({ modelo_id, ano_inicio, ano_fim });
  }

  return { ok: true, rows: out };
}
