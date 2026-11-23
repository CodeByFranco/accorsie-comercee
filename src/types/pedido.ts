export type PedidoStatus =
  | "rascunho"
  | "aguardando_pagamento"
  | "pago"
  | "cancelado"
  | "reembolsado"
  | "falha_pagamento";

/** Linha mínima para listagem em /pedidos */
export type PedidoListRow = {
  id: string;
  status: PedidoStatus;
  total: unknown;
  created_at: string;
  rastreio_codigo: string | null;
  rastreio_url: string | null;
};

export type PedidoItemRow = {
  id: string;
  /** Null se o produto foi removido do catálogo após o pedido. */
  produto_id: string | null;
  quantidade: number;
  preco_unitario: unknown;
  titulo_snapshot: string;
  cod_produto_snapshot: string;
};

export type PedidoDetailWithItens = PedidoListRow & {
  subtotal: unknown;
  frete: unknown;
  retirada_loja?: boolean;
  destinatario_nome: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  mercadopago_status: string | null;
  mercadopago_payment_id: string | null;
  rastreio_codigo: string | null;
  rastreio_url: string | null;
  pedido_itens: PedidoItemRow[];
};

export type PedidoLogisticaStatus = "nao_iniciado" | "em_separacao" | "postado" | "entregue";

export type PedidoDevolucaoStatus = "aguardando_retorno" | "recebida";

/** Linha para listagem no painel admin (service role). */
export type AdminPedidoListRow = {
  id: string;
  user_id: string;
  status: PedidoStatus;
  total: unknown;
  created_at: string;
  destinatario_nome: string;
  logistica_status: PedidoLogisticaStatus;
  rastreio_codigo: string | null;
  retirada_loja?: boolean | null;
  destinatario_documento?: string | null;
  /** Sequencial por data de criação (001, 002, ...). */
  codigo_ui?: number | null;
  devolucao_status?: PedidoDevolucaoStatus | null;
};

export type AdminPedidoDetailWithItens = PedidoDetailWithItens & {
  /** Código sequencial para UI admin (001, 002, ...). */
  codigo_ui?: number | null;
  user_id: string;
  /** CPF/CNPJ (somente dígitos recomendado) para Melhor Envio / declaração de conteúdo. */
  destinatario_documento: string | null;
  mercadopago_preference_id: string | null;
  rastreio_codigo: string | null;
  rastreio_url: string | null;
  transportadora_nome: string | null;
  melhor_envio_id: string | null;
  melhor_envio_etiqueta_url: string | null;
  frete_provedor: string | null;
  logistica_status: PedidoLogisticaStatus;
  /** E-mail em `auth.users`, quando disponível. */
  cliente_email: string | null;
  cancelamento_motivo: string | null;
  reembolso_valor: unknown;
  reembolsado_em: string | null;
  devolucao_status: PedidoDevolucaoStatus | null;
  devolucao_motivo: string | null;
  devolucao_rastreio: string | null;
  devolucao_solicitada_em: string | null;
  devolucao_recebida_em: string | null;
};
