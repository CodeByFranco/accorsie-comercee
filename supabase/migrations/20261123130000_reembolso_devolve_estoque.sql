-- Ao virar reembolsado (vindo de pago), devolve ao estoque o que foi baixado na aprovação.
-- Cobre o botão "Reembolsar" do admin e reembolsos/chargebacks que chegam pelo webhook.
create or replace function public.pedidos_reembolso_devolve_estoque()
returns trigger
language plpgsql
security definer
set search_path = pg_temp, public
as $$
begin
  if new.status = 'reembolsado'::public.pedido_status
     and old.status = 'pago'::public.pedido_status
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

drop trigger if exists pedidos_reembolso_estoque on public.pedidos;
create trigger pedidos_reembolso_estoque
  after update of status on public.pedidos
  for each row
  when (old.status is distinct from new.status)
  execute function public.pedidos_reembolso_devolve_estoque();
