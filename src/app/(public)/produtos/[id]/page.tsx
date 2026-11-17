import { notFound } from "next/navigation";

import { ProductStorefrontDetail } from "@/features/produtos/components/ProductStorefrontDetail";
import { getProductDetailPageData } from "@/features/produtos/services/getProductDetailPageData";
import { getKitsForProduct } from "@/features/kits/services/getKitsForProduct";
import { getComboOleo, getDescontosPadrao } from "@/features/kits/services/kitCombo";
import { isKitFiltrosProduto } from "@/features/kits/utils/comboOleo";
import { createPublicClient } from "@/services/supabase/public";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { produto } = await getProductDetailPageData(id);
  return { title: produto ? `${produto.titulo} | Produto` : "Produto não encontrado" };
}

export default async function ProdutoDetalhePage({ params }: PageProps) {
  const { id } = await params;
  const [{ produto, relacionados }, kitsDoProduto] = await Promise.all([
    getProductDetailPageData(id),
    getKitsForProduct(id),
  ]);

  if (!produto) notFound();

  const supabase = createPublicClient();
  const [comboOleo, kitDescontoPadrao] = await Promise.all([
    isKitFiltrosProduto(produto.titulo) ? getComboOleo(supabase) : Promise.resolve(null),
    getDescontosPadrao(supabase),
  ]);

  return (
    <ProductStorefrontDetail
      produto={produto}
      relacionados={relacionados}
      kits={kitsDoProduto}
      comboOleo={comboOleo?.combo ? { combo: comboOleo.combo, descontoPadrao: comboOleo.descontoPadrao } : null}
      kitDescontoPadrao={kitDescontoPadrao}
    />
  );
}
