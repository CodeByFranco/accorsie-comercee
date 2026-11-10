-- Cashback: 2,5% do total pago vira saldo para abater nas próximas compras.
-- Fluxo:
--  * Checkout: `aplicar_cashback_pedido` debita o saldo e reduz o total do pedido (antes de abrir o MP).
--  * Pedido -> 'pago': trigger credita 2,5% do total pago.
--  * Pedido -> 'falha_pagamento' / 'cancelado' / 'reembolsado': devolve o saldo usado;
--    em 'reembolsado' também estorna o crédito gerado (limitado ao saldo disponível).

alter table public.pedidos
  add column if not exists desconto_cashback numeric(12, 2) not null default 0
    check (desconto_cashback >= 0),
  add column if not exists cashback_gerado numeric(12, 2) not null default 0
    check (cashback_gerado >= 0);

create table if not exists public.cashback_transacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pedido_id uuid references public.pedidos (id) on delete set null,
  tipo text not null check (tipo in ('credito', 'uso', 'estorno_uso', 'estorno_credito', 'ajuste')),
  -- Positivo = entra no saldo; negativo = sai do saldo.
  valor numeric(12, 2) not null check (valor <> 0),
  descricao text,
  created_at timestamptz not null default now()
);

create index if not exists cashback_transacoes_user_idx
  on public.cashback_transacoes (user_id, created_at desc);

-- Idempotência: no máximo um lançamento de cada tipo automático por pedido.
create unique index if not exists cashback_transacoes_pedido_tipo_uniq
  on public.cashback_transacoes (pedido_id, tipo)
  where pedido_id is not null and tipo <> 'ajuste';

alter table public.cashback_transacoes enable row level security;

drop policy if exists "cashback_transacoes_select_own" on public.cashback_transacoes;
create policy "cashback_transacoes_select_own"
  on public.cashback_transacoes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Percentual central (alterar aqui se a regra mudar).
create or replace function public.cashback_percentual()
returns numeric
language sql
immutable
as $$ select 2.5::numeric $$;

create or replace function public.cashback_saldo(p_user_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(valor), 0)::numeric(12, 2)
  from public.cashback_transacoes
  where user_id = p_user_id;
$$;

revoke all on function public.cashback_saldo(uuid) from public;
grant execute on function public.cashback_saldo(uuid) to service_role;

/** Saldo do usuário logado. */
create or replace function public.meu_saldo_cashback()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select public.cashback_saldo(auth.uid());
$$;

revoke all on function public.meu_saldo_cashback() from public;
grant execute on function public.meu_saldo_cashback() to authenticated;

/**
 * Abate cashback em um pedido recém-criado do próprio usuário (aguardando pagamento).
 * Mantém ao menos R$ 1,00 a pagar (exigência prática do Mercado Pago). Retorna o valor aplicado.
 */
create or replace function public.aplicar_cashback_pedido(p_pedido_id uuid, p_valor numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pedido public.pedidos%rowtype;
  v_saldo numeric(12, 2);
  v_aplicar numeric(12, 2);
begin
  if v_uid is null then
    raise exception 'Sessão obrigatória.';
  end if;

  if p_valor is null or p_valor <= 0 then
    return 0;
  end if;

  -- Serializa usos concorrentes do mesmo cliente.
  perform pg_advisory_xact_lock(hashtext('cashback:' || v_uid::text));

  select * into v_pedido
  from public.pedidos
  where id = p_pedido_id and user_id = v_uid
  for update;

  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

  if v_pedido.status <> 'aguardando_pagamento'::public.pedido_status then
    raise exception 'Cashback só pode ser aplicado a pedidos aguardando pagamento.';
  end if;

  if v_pedido.desconto_cashback > 0 then
    return v_pedido.desconto_cashback;
  end if;

  v_saldo := public.cashback_saldo(v_uid);
  v_aplicar := round(least(p_valor, v_saldo, greatest(v_pedido.total - 1, 0)), 2);

  if v_aplicar <= 0 then
    return 0;
  end if;

  update public.pedidos
  set desconto_cashback = v_aplicar,
      total = round(total - v_aplicar, 2)
  where id = p_pedido_id;

  insert into public.cashback_transacoes (user_id, pedido_id, tipo, valor, descricao)
  values (v_uid, p_pedido_id, 'uso', -v_aplicar, 'Cashback usado no pedido');

  return v_aplicar;
end;
$$;

revoke all on function public.aplicar_cashback_pedido(uuid, numeric) from public;
grant execute on function public.aplicar_cashback_pedido(uuid, numeric) to authenticated, service_role;

/** Créditos/estornos automáticos conforme o status do pedido muda. */
create or replace function public.pedidos_cashback_on_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credito numeric(12, 2);
  v_saldo numeric(12, 2);
  v_estorno numeric(12, 2);
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('cashback:' || new.user_id::text));

  if new.status = 'pago'::public.pedido_status then
    v_credito := round(new.total * public.cashback_percentual() / 100, 2);
    if v_credito > 0 then
      insert into public.cashback_transacoes (user_id, pedido_id, tipo, valor, descricao)
      values (new.user_id, new.id, 'credito', v_credito,
              'Cashback de ' || public.cashback_percentual() || '% da compra')
      on conflict do nothing;
      if found then
        new.cashback_gerado := v_credito;
      end if;
    end if;
  end if;

  if new.status in (
    'falha_pagamento'::public.pedido_status,
    'cancelado'::public.pedido_status,
    'reembolsado'::public.pedido_status
  ) then
    -- Devolve o saldo usado neste pedido.
    if new.desconto_cashback > 0 then
      insert into public.cashback_transacoes (user_id, pedido_id, tipo, valor, descricao)
      values (new.user_id, new.id, 'estorno_uso', new.desconto_cashback,
              'Cashback devolvido (pedido não concluído)')
      on conflict do nothing;
    end if;

    -- Retira o cashback que o pedido tinha gerado (sem deixar saldo negativo).
    if new.cashback_gerado > 0 then
      v_saldo := public.cashback_saldo(new.user_id);
      v_estorno := least(new.cashback_gerado, greatest(v_saldo, 0));
      if v_estorno > 0 then
        insert into public.cashback_transacoes (user_id, pedido_id, tipo, valor, descricao)
        values (new.user_id, new.id, 'estorno_credito', -v_estorno,
                'Cashback estornado (pedido reembolsado/cancelado)')
        on conflict do nothing;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists pedidos_cashback_status on public.pedidos;
create trigger pedidos_cashback_status
  before update of status on public.pedidos
  for each row
  execute function public.pedidos_cashback_on_status();
