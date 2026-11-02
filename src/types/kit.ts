import type { ProductStatus } from "@/features/produtos/utils/productStatus";

export type KitDiscountType = "percentual" | "valor_fixo" | "preco_fixo";
export type KitStatus = ProductStatus;

export type KitItemInput = {
  product_id: string;
  quantidade: number;
};

/** Item em que o cliente escolhe o produto (entre opções) e a quantidade. */
export type KitChoiceInput = {
  /** Presente quando o item já existe no banco. */
  id?: string;
  nome: string;
  qtd_min: number;
  qtd_max: number;
  qtd_padrao: number;
  product_ids: string[];
};

/** Escolha feita pelo cliente para um item de escolha do kit. */
export type KitChoiceSelection = {
  kit_item_id: string;
  product_id: string;
  quantidade: number;
};

export type KitSummary = {
  id: string;
  slug: string;
  nome: string;
  imagem: string | null;
  precoNormal: number;
  precoKit: number;
  economia: number;
  itemCount: number;
  /** Kit tem itens em que o cliente escolhe produto/quantidade (preço "a partir de"). */
  temEscolha: boolean;
  categoria: { id: string; nome: string; slug: string } | null;
};

export type KitProductInfo = {
  product_id: string;
  titulo: string;
  cod_produto: string;
  valor: number;
  imageUrl: string | null;
  quantidade_estoque: number;
  desconto_pix_percent: number;
  desconto_cartao_percent: number;
  somente_retirada_loja: boolean;
};

export type KitDetailItem = KitProductInfo & { quantidade: number };

export type KitChoiceItem = {
  kit_item_id: string;
  nome: string;
  qtd_min: number;
  qtd_max: number;
  qtd_padrao: number;
  opcoes: KitProductInfo[];
};

export type KitDetail = KitSummary & {
  descricao: string;
  seo_title: string | null;
  seo_description: string | null;
  tipo_desconto: KitDiscountType;
  valor_desconto: number;
  preco_final: number | null;
  status: KitStatus;
  items: KitDetailItem[];
  escolhas: KitChoiceItem[];
};
