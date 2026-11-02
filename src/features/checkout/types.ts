import type { FormaPagamentoCheckout } from "@/features/produtos/utils/paymentDiscount";
import type { KitChoiceSelection } from "@/types/kit";

/** Linha enviada pelo cliente para o servidor recalcular preço e estoque (RPC). */
export type CheckoutCartLineInput = {
  produto_id: string;
  quantidade: number;
};

export type CheckoutEntregaInput = {
  destinatario_nome: string;
  telefone: string;
  /** CPF (11) ou CNPJ (14) só dígitos — obrigatório quando `retirada_loja` for false. */
  destinatario_documento?: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export type CheckoutPayload = CheckoutEntregaInput & {
  itens: CheckoutCartLineInput[];
  /** Valor do frete (reais). Zero em retirada na loja; com entrega, maior que zero. */
  frete: number;
  /** Define desconto por produto na RPC (`desconto_pix_percent` vs `desconto_cartao_percent`). */
  forma_pagamento: FormaPagamentoCheckout;
  /** Sem envio (Correios/Melhor Envio): frete zero e endereço da loja gravado no pedido. */
  retirada_loja?: boolean;
  /** Código do cupom (opcional); validado na RPC `criar_pedido_checkout`. */
  cupom_codigo?: string;
  /** Kits aplicados com as escolhas do cliente (desconto oficial validado na RPC). */
  kits?: CheckoutKitInput[];
};

export type CheckoutKitInput = {
  kit_id: string;
  escolhas?: KitChoiceSelection[];
};
