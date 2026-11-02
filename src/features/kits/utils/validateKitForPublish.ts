import type { KitDiscountType } from "@/types/kit";
import { parseKitDiscountType } from "@/features/kits/utils/kitPricing";

export type PublishKitFields = {
  nome: string | null | undefined;
  slug: string | null | undefined;
  tipo_desconto: KitDiscountType | string | null | undefined;
  valor_desconto: number | null | undefined;
  preco_final: number | null | undefined;
  itemCount: number;
  /** Itens de escolha do cliente: nome e quantas opções cada um tem. */
  escolhas?: Array<{ nome: string; opcoesCount: number }>;
};

export function getPendingKitPublishFields(fields: PublishKitFields): string[] {
  const pending: string[] = [];
  if (!fields.nome?.trim()) pending.push("Nome");
  if (!fields.slug?.trim()) pending.push("Slug");
  if (fields.itemCount < 1) pending.push("Itens do kit (ao menos 1)");

  const tipo = parseKitDiscountType(fields.tipo_desconto);
  const escolhas = fields.escolhas ?? [];
  for (const e of escolhas) {
    if (e.opcoesCount < 1) pending.push(`Opções da escolha "${e.nome.trim() || "sem nome"}"`);
  }
  if (escolhas.length > 0 && tipo !== "percentual") {
    pending.push("Kits com escolha do cliente usam desconto percentual");
  }
  if (tipo === "preco_fixo") {
    if (fields.preco_final == null || !Number.isFinite(fields.preco_final) || fields.preco_final < 0) {
      pending.push("Preço fixo do kit");
    }
  } else if (tipo === "percentual") {
    const v = Number(fields.valor_desconto);
    if (!Number.isFinite(v) || v < 0 || v > 100) pending.push("Desconto percentual (0–100)");
  } else {
    const v = Number(fields.valor_desconto);
    if (!Number.isFinite(v) || v < 0) pending.push("Desconto em valor");
  }

  return pending;
}

export function validateKitForPublish(
  fields: PublishKitFields,
): { ok: true } | { ok: false; pending: string[]; message: string } {
  const pending = getPendingKitPublishFields(fields);
  if (pending.length === 0) return { ok: true };
  return {
    ok: false,
    pending,
    message: `Não é possível publicar. Campos pendentes: ${pending.join(", ")}.`,
  };
}
