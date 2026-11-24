/**
 * Eventos de e-mail transacional alinhados ao RPC `admin_pedido_marcar_email_disparado`
 * (`pedido_criado`, `pagamento_confirmado`, `enviado`).
 */
export type TransactionalEmailKind = "pedido_criado" | "pagamento_confirmado" | "pedido_enviado" | "pedido_reembolsado";

/** Payload mínimo para montar assunto/corpo e link do pedido. */
export type TransactionalEmailPayload = {
  kind: TransactionalEmailKind;
  pedidoId: string;
  /** Destinatário (normalmente o e-mail da conta). */
  to: string;
  /** URL absoluta para `/pedidos/[id]`. */
  pedidoUrl: string;
  /** Valor total legível (opcional). */
  totalLabel?: string;
  /** Código de rastreio, quando houver (pedido enviado). */
  trackingCode?: string;
  /** URL de rastreio, quando houver (pedido enviado). */
  trackingUrl?: string;
};

export type EmailSendInput = {
  to: string;
  subject: string;
  text: string;
};

export type EmailSendResult = { ok: boolean; providerMessageId?: string };

export interface EmailSender {
  send(input: EmailSendInput): Promise<EmailSendResult>;
}
