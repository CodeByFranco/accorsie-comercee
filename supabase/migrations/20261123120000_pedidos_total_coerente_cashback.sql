-- O cashback reduz `total` (aplicar_cashback_pedido), mas a constraint não o considerava.
alter table public.pedidos
  drop constraint if exists pedidos_total_coerente;

alter table public.pedidos
  add constraint pedidos_total_coerente
  check (total = subtotal + frete - desconto_cupom - desconto_kit - desconto_cashback);
