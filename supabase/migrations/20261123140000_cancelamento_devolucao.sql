-- Cancelamento com reembolso antes do envio e fluxo de devolução depois do envio.
--  * Antes do envio: reembolso total, estoque volta automaticamente (trigger abaixo).
--  * Depois do envio: pedido entra em devolução; só reembolsa ao receber a peça de volta,
--    e o estoque volta item a item, conforme o admin conferir.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pedido_devolucao_status') then
    create type public.pedido_devolucao_status as enum ('aguardando_retorno', 'recebida');
  end if;
end;
$$;

alter table public.pedidos
  add column if not exists cancelamento_motivo text,
  add column if not exists reembolso_valor numeric(12, 2),
  add column if not exists reembolsado_em timestamptz,
  add column if not exists email_reembolso_at timestamptz,
  add column if not exists devolucao_status public.pedido_devolucao_status,
  add column if not exists devolucao_motivo text,
  add column if not exists devolucao_rastreio text,
  add column if not exists devolucao_solicitada_em timestamptz,
  add column if not exists devolucao_recebida_em timestamptz;

-- Estoque automático só quando a peça nunca saiu da loja.
-- Pedido postado/entregue (ou chargeback depois do envio) não repõe sozinho:
-- a reposição é feita na conferência da devolução.
create or replace function public.pedidos_reembolso_devolve_estoque()
returns trigger
language plpgsql
security definer
set search_path = pg_temp, public
as $$
begin
  if new.status = 'reembolsado'::public.pedido_status
     and old.status = 'pago'::public.pedido_status
     and old.logistica_status in ('nao_iniciado'::public.pedido_logistica_status, 'em_separacao'::public.pedido_logistica_status)
     and new.devolucao_status is null
  then
    update public.produtos p
    set quantidade_estoque = p.quantidade_estoque + i.qtd
    from (
      select produto_id, sum(quantidade) as qtd
      from public.pedido_itens
      where pedido_id = new.id and produto_id is not null
      group by produto_id
    ) i
    where p.id = i.produto_id;
  end if;
  return new;
end;
$$;

revoke all on function public.pedidos_reembolso_devolve_estoque() from public;

-- Repõe no estoque os itens conferidos na devolução.
-- p_itens: [{ "item_id": uuid, "quantidade": int }]; quantidade limitada ao que foi comprado.
create or replace function public.admin_pedido_devolucao_repor_estoque(p_pedido_id uuid, p_itens jsonb)
returns integer
language plpgsql
security definer
set search_path = pg_temp, public
as $$
declare
  v_total integer := 0;
  r record;
begin
  for r in
    select pi.produto_id, least(pi.quantidade, greatest(coalesce((x->>'quantidade')::int, 0), 0)) as qtd
    from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) x
    join public.pedido_itens pi
      on pi.id = (x->>'item_id')::uuid and pi.pedido_id = p_pedido_id
    where pi.produto_id is not null
  loop
    if r.qtd > 0 then
      update public.produtos set quantidade_estoque = quantidade_estoque + r.qtd where id = r.produto_id;
      v_total := v_total + r.qtd;
    end if;
  end loop;
  return v_total;
end;
$$;

revoke all on function public.admin_pedido_devolucao_repor_estoque(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_pedido_devolucao_repor_estoque(uuid, jsonb) to service_role;
