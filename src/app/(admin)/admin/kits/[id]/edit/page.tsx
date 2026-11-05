import Link from "next/link";
import { notFound } from "next/navigation";
import {
  KitEditForm,
  type KitCategoriaOption,
  type KitEditValues,
} from "@/features/kits/components/KitEditForm";
import type { KitPickerProduct } from "@/features/kits/components/KitItemsPicker";
import { parseKitDiscountType } from "@/features/kits/utils/kitPricing";
import { parseKitStatus } from "@/features/kits/utils/kitStatus";
import { createClient } from "@/services/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("kits").select("nome").eq("id", id).maybeSingle();
    if (data?.nome) return { title: `${data.nome} | Editar kit | Admin` };
  } catch {
    /* ignore */
  }
  return { title: "Editar kit | Admin" };
}

export default async function EditKitPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [kitRes, itemsRes, productsRes, categoriasRes, prodCatRes] = await Promise.all([
    supabase
      .from("kits")
      .select(
        "id, nome, slug, descricao, imagem, tipo_desconto, valor_desconto, preco_final, seo_title, seo_description, status, categoria_id, usa_desconto_padrao",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("kit_items")
      .select("id, tipo, nome, qtd_min, qtd_max, product_id, quantidade, kit_item_opcoes ( product_id )")
      .eq("kit_id", id)
      .order("created_at"),
    supabase
      .from("produtos")
      .select("id, titulo, cod_produto, valor")
      .order("titulo"),
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase.from("produto_categorias").select("produto_id, categoria_id"),
  ]);

  if (kitRes.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
        {kitRes.error.message}
      </div>
    );
  }
  if (!kitRes.data) notFound();

  const k = kitRes.data;
  const kit: KitEditValues = {
    id: k.id,
    nome: k.nome ?? "",
    slug: k.slug ?? "",
    descricao: k.descricao ?? "",
    imagem: k.imagem ?? "",
    tipo_desconto: parseKitDiscountType(k.tipo_desconto),
    valor_desconto: Number(k.valor_desconto) || 0,
    preco_final: k.preco_final != null ? Number(k.preco_final) : null,
    seo_title: k.seo_title ?? "",
    seo_description: k.seo_description ?? "",
    status: parseKitStatus(k.status),
    categoria_id: k.categoria_id ?? "",
    usa_desconto_padrao: k.usa_desconto_padrao !== false,
    items: (itemsRes.data ?? [])
      .filter((row) => (row.tipo ?? "fixo") === "fixo" && row.product_id)
      .map((row) => ({
        product_id: row.product_id as string,
        quantidade: Number(row.quantidade) || 1,
      })),
    choices: (itemsRes.data ?? [])
      .filter((row) => row.tipo === "escolha")
      .map((row) => ({
        id: row.id as string,
        nome: row.nome ?? "",
        qtd_min: Number(row.qtd_min) || 1,
        qtd_max: Number(row.qtd_max) || 1,
        qtd_padrao: Number(row.quantidade) || 1,
        product_ids: (Array.isArray(row.kit_item_opcoes) ? row.kit_item_opcoes : []).map(
          (o: { product_id: string }) => o.product_id,
        ),
      })),
  };

  const categoriasByProduct = new Map<string, string[]>();
  for (const row of prodCatRes.data ?? []) {
    const list = categoriasByProduct.get(row.produto_id) ?? [];
    list.push(row.categoria_id);
    categoriasByProduct.set(row.produto_id, list);
  }
  const categorias: KitCategoriaOption[] = (categoriasRes.data ?? []).map((c) => ({
    id: c.id as string,
    nome: String(c.nome),
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
      <Link
        href="/admin/kits"
        className="inline-flex text-sm font-semibold text-admin-accent hover:underline"
      >
        ← Voltar aos kits
      </Link>
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
        <KitEditForm kit={kit} products={products} categorias={categorias} />
      </div>
    </div>
  );
}
