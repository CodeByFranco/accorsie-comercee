"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { parseKitDiscountType } from "@/features/kits/utils/kitPricing";
import { parseKitStatus } from "@/features/kits/utils/kitStatus";
import { validateKitForPublish } from "@/features/kits/utils/validateKitForPublish";
import { slugify } from "@/utils/slugify";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import type { KitChoiceInput } from "@/types/kit";

export type UpdateKitState =
  | { ok: true; message: string }
  | { ok: false; message: string };

function parseItemsJson(raw: string): { ok: true; items: Array<{ product_id: string; quantidade: number }> } | { ok: false; message: string } {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(parsed)) return { ok: false, message: "Itens do kit inválidos." };
    const items: Array<{ product_id: string; quantidade: number }> = [];
    const seen = new Set<string>();
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const product_id = String(r.product_id ?? "").trim();
      const quantidade = Number.parseInt(String(r.quantidade ?? ""), 10);
      if (!product_id || !Number.isFinite(quantidade) || quantidade < 1) {
        return { ok: false, message: "Cada item precisa de produto e quantidade ≥ 1." };
      }
      if (seen.has(product_id)) continue;
      seen.add(product_id);
      items.push({ product_id, quantidade });
    }
    return { ok: true, items };
  } catch {
    return { ok: false, message: "Não foi possível ler os itens do kit." };
  }
}

function parseChoicesJson(raw: string): { ok: true; choices: KitChoiceInput[] } | { ok: false; message: string } {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(parsed)) return { ok: false, message: "Itens de escolha inválidos." };
    const choices: KitChoiceInput[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const nome = String(r.nome ?? "").trim();
      const qtd_min = Number.parseInt(String(r.qtd_min ?? ""), 10);
      const qtd_max = Number.parseInt(String(r.qtd_max ?? ""), 10);
      const qtd_padrao = Number.parseInt(String(r.qtd_padrao ?? ""), 10);
      if (!nome) return { ok: false, message: "Dê um nome para cada item de escolha (ex.: Óleo do motor)." };
      if (
        !Number.isFinite(qtd_min) || !Number.isFinite(qtd_max) || !Number.isFinite(qtd_padrao) ||
        qtd_min < 1 || qtd_max < qtd_min || qtd_padrao < qtd_min || qtd_padrao > qtd_max
      ) {
        return {
          ok: false,
          message: `"${nome}": a quantidade precisa ter mínimo ≥ 1, máximo ≥ mínimo e sugerida entre os dois.`,
        };
      }
      const ids = Array.isArray(r.product_ids) ? r.product_ids : [];
      const product_ids = [...new Set(ids.map((x) => String(x ?? "").trim()).filter(Boolean))];
      const idRaw = String(r.id ?? "").trim();
      choices.push({ ...(idRaw ? { id: idRaw } : {}), nome, qtd_min, qtd_max, qtd_padrao, product_ids });
    }
    return { ok: true, choices };
  } catch {
    return { ok: false, message: "Não foi possível ler os itens de escolha." };
  }
}

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
  excludeId: string,
): Promise<string> {
  let candidate = slugify(base) || "kit";
  if (candidate === "marca") candidate = "kit";
  for (let i = 0; i < 50; i++) {
    const trySlug = i === 0 ? candidate : `${candidate}-${i + 1}`;
    const { data } = await supabase
      .from("kits")
      .select("id")
      .eq("slug", trySlug)
      .neq("id", excludeId)
      .maybeSingle();
    if (!data) return trySlug;
  }
  return `${candidate}-${Date.now().toString(36)}`;
}

export async function updateKit(
  _prev: UpdateKitState | null,
  formData: FormData,
): Promise<UpdateKitState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Kit não identificado." };

  const nomeRaw = String(formData.get("nome") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const imagem = String(formData.get("imagem") ?? "").trim() || null;
  const seo_title = String(formData.get("seo_title") ?? "").trim() || null;
  const seo_description = String(formData.get("seo_description") ?? "").trim() || null;
  const tipo_desconto = parseKitDiscountType(formData.get("tipo_desconto"));
  const valor_desconto = Number.parseFloat(String(formData.get("valor_desconto") ?? "0").replace(",", "."));
  const precoFinalRaw = String(formData.get("preco_final") ?? "").replace(",", ".").trim();
  const preco_final = precoFinalRaw
    ? Number.parseFloat(precoFinalRaw)
    : null;

  if (Number.isNaN(valor_desconto) || valor_desconto < 0) {
    return { ok: false, message: "Valor de desconto inválido." };
  }
  if (preco_final != null && (Number.isNaN(preco_final) || preco_final < 0)) {
    return { ok: false, message: "Preço fixo inválido." };
  }

  const categoria_id = String(formData.get("categoria_id") ?? "").trim() || null;

  const itemsParsed = parseItemsJson(String(formData.get("kit_items_json") ?? "[]"));
  if (!itemsParsed.ok) return { ok: false, message: itemsParsed.message };
  const choicesParsed = parseChoicesJson(String(formData.get("kit_choices_json") ?? "[]"));
  if (!choicesParsed.ok) return { ok: false, message: choicesParsed.message };
  const choices = choicesParsed.choices;

  const supabase = await createClient();
  const { data: existing, error: exErr } = await supabase
    .from("kits")
    .select("status, slug")
    .eq("id", id)
    .maybeSingle();
  if (exErr) return { ok: false, message: exErr.message };
  if (!existing) return { ok: false, message: "Kit não encontrado." };

  const status = parseKitStatus(existing.status);
  const nome = nomeRaw || null;
  let slug = slugRaw ? slugify(slugRaw) : nomeRaw ? await uniqueSlug(supabase, nomeRaw, id) : null;
  if (slugRaw && slug) {
    slug = await uniqueSlug(supabase, slug, id);
  }

  if (status === "published") {
    const validation = validateKitForPublish({
      nome,
      slug,
      tipo_desconto,
      valor_desconto,
      preco_final,
      itemCount: itemsParsed.items.length + choices.length,
      escolhas: choices.map((c) => ({ nome: c.nome, opcoesCount: c.product_ids.length })),
    });
    if (!validation.ok) {
      return {
        ok: false,
        message: `Kit publicado: ${validation.message}`,
      };
    }
  }

  const { error: updErr } = await supabase
    .from("kits")
    .update({
      nome,
      slug,
      descricao,
      imagem,
      tipo_desconto,
      valor_desconto: tipo_desconto === "preco_fixo" ? 0 : valor_desconto,
      preco_final: tipo_desconto === "preco_fixo" ? preco_final : null,
      seo_title,
      seo_description,
      categoria_id,
    })
    .eq("id", id);

  if (updErr) {
    if (updErr.code === "23505") {
      return { ok: false, message: "Já existe um kit com este slug." };
    }
    return { ok: false, message: updErr.message };
  }

  // Itens de escolha mantêm o id (carrinhos em andamento referenciam kit_item_id).
  const { data: existingChoices } = await supabase
    .from("kit_items")
    .select("id")
    .eq("kit_id", id)
    .eq("tipo", "escolha");
  const existingChoiceIds = new Set((existingChoices ?? []).map((r) => r.id as string));
  const keptChoiceIds = choices.map((c) => c.id).filter((cid): cid is string => !!cid && existingChoiceIds.has(cid));

  let delQuery = supabase.from("kit_items").delete().eq("kit_id", id);
  if (keptChoiceIds.length > 0) {
    delQuery = delQuery.not("id", "in", `(${keptChoiceIds.join(",")})`);
  }
  const { error: delErr } = await delQuery;
  if (delErr) {
    return { ok: false, message: `Dados salvos, mas itens falharam: ${delErr.message}` };
  }

  if (itemsParsed.items.length > 0) {
    const { error: insErr } = await supabase.from("kit_items").insert(
      itemsParsed.items.map((it) => ({
        kit_id: id,
        product_id: it.product_id,
        quantidade: it.quantidade,
      })),
    );
    if (insErr) {
      return { ok: false, message: `Kit salvo, mas itens falharam: ${insErr.message}` };
    }
  }

  for (const choice of choices) {
    const fields = {
      nome: choice.nome,
      qtd_min: choice.qtd_min,
      qtd_max: choice.qtd_max,
      quantidade: choice.qtd_padrao,
    };
    let choiceId: string;
    if (choice.id && existingChoiceIds.has(choice.id)) {
      const { error: chErr } = await supabase.from("kit_items").update(fields).eq("id", choice.id);
      if (chErr) return { ok: false, message: `Kit salvo, mas "${choice.nome}" falhou: ${chErr.message}` };
      const { error: clrErr } = await supabase.from("kit_item_opcoes").delete().eq("kit_item_id", choice.id);
      if (clrErr) return { ok: false, message: `Kit salvo, mas opções de "${choice.nome}" falharam: ${clrErr.message}` };
      choiceId = choice.id;
    } else {
      const { data: created, error: chErr } = await supabase
        .from("kit_items")
        .insert({ kit_id: id, tipo: "escolha", product_id: null, ...fields })
        .select("id")
        .single();
      if (chErr || !created) {
        return { ok: false, message: `Kit salvo, mas "${choice.nome}" falhou: ${chErr?.message ?? "erro"}` };
      }
      choiceId = created.id as string;
    }
    if (choice.product_ids.length > 0) {
      const { error: opErr } = await supabase
        .from("kit_item_opcoes")
        .insert(choice.product_ids.map((product_id) => ({ kit_item_id: choiceId, product_id })));
      if (opErr) {
        return { ok: false, message: `Kit salvo, mas opções de "${choice.nome}" falharam: ${opErr.message}` };
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/kits");
  revalidatePath("/admin/kits");
  revalidatePath(`/admin/kits/${id}/edit`);
  if (slug) revalidatePath(`/kit/${slug}`);

  return { ok: true, message: "Kit atualizado com sucesso." };
}
