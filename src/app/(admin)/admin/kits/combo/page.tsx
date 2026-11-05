import Link from "next/link";
import type { KitCategoriaOption } from "@/features/kits/components/KitEditForm";
import { KitComboForm } from "@/features/kits/components/KitComboForm";
import type { KitPickerProduct } from "@/features/kits/components/KitItemsPicker";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/services/supabase/server";
import { KIT_COMBO_SELECT, mapDescontoPadrao } from "@/features/kits/services/kitCombo";
import type { KitComboConfig } from "@/types/kit";

export const metadata = { title: "Combo dos kits | Admin" };

export default async function KitComboPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [cfgRes, opcoesRes, productsRes, categoriasRes, prodCatRes] = await Promise.all([
    supabase
      .from("kit_combo")
      .select(KIT_COMBO_SELECT)
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("kit_combo_opcoes").select("product_id"),
    supabase.from("produtos").select("id, titulo, cod_produto, valor").order("titulo"),
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase.from("produto_categorias").select("produto_id, categoria_id"),
  ]);

  if (cfgRes.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
        {cfgRes.error.message} — aplique as migrations 20261105120000 e 20261105160000.
      </div>
    );
  }

  const c = cfgRes.data;
  const initial: KitComboConfig = {
    ativo: c?.ativo === true,
    nome: c?.nome ?? "Óleo do motor",
    qtd_min: Number(c?.qtd_min) || 1,
    qtd_padrao: Number(c?.qtd_padrao) || 1,
    qtd_max: Number(c?.qtd_max) || 1,
    ...mapDescontoPadrao(c),
    product_ids: (opcoesRes.data ?? []).map((r) => r.product_id as string),
  };

  const categoriasByProduct = new Map<string, string[]>();
  for (const row of prodCatRes.data ?? []) {
    const list = categoriasByProduct.get(row.produto_id) ?? [];
    list.push(row.categoria_id);
    categoriasByProduct.set(row.produto_id, list);
  }
  const categorias: KitCategoriaOption[] = (categoriasRes.data ?? []).map((cat) => ({
    id: cat.id as string,
    nome: String(cat.nome),
  }));
  const products: KitPickerProduct[] = (productsRes.data ?? [])
    .filter((p) => p.titulo && p.valor != null)
    .map((p) => ({
      id: p.id,
      titulo: String(p.titulo),
      cod_produto: String(p.cod_produto ?? ""),
      valor: Number(p.valor),
      categoria_ids: categoriasByProduct.get(p.id) ?? [],
    }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/kits" className="inline-flex text-sm font-semibold text-admin-accent hover:underline">
        ← Voltar aos kits
      </Link>
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
        <KitComboForm initial={initial} products={products} categorias={categorias} />
      </div>
    </div>
  );
}
