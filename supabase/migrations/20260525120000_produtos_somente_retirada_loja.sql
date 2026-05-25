-- Produtos que não podem ser enviados: checkout força retirada na loja.
alter table public.produtos
  add column if not exists somente_retirada_loja boolean not null default false;

comment on column public.produtos.somente_retirada_loja is
  'Quando true, o item só pode ser vendido com retirada na loja (sem cotação/envio).';
