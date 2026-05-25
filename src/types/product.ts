/** Dados mínimos do produto para cards na vitrine (home). */
export type ProductSummary = {
  id: string;
  titulo: string;
  cod_produto: string;
  valor: number;
  imageUrl: string | null;
  /** Unidades disponíveis para venda (mesmo campo do cadastro em `produtos`). */
  quantidade_estoque: number;
  /** 0–100; desconto sobre o valor base ao pagar com PIX (Mercado Pago). */
  desconto_pix_percent: number;
  /** 0–100; desconto sobre o valor base ao pagar com cartão (opcional). */
  desconto_cartao_percent: number;
  /** Quando true, o item não pode ser enviado; checkout do pedido fica só com retirada na loja. */
  somente_retirada_loja: boolean;
};
