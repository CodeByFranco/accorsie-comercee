-- Cashback configurável em /admin/financeiro.
--  * percentual: % do total pago que vira saldo.
--  * modo de uso:
--      'livre'      -> cliente escolhe se usa (comportamento anterior).
--      'sempre'     -> havendo saldo, é descontado automaticamente na próxima compra.
--      'teto'       -> ao atingir `teto_valor` de saldo, é descontado automaticamente na próxima compra.
--      'a_cada_n'   -> após `a_cada_n - 1` compras pagas sem usar, a N-ésima desconta automaticamente.

create table if not exists public.cashback_config (
  id smallint primary key default 1,
  percentual numeric(5, 2) not null default 2.5,
  modo text not null default 'livre',
  teto_valor numeric(12, 2) not null default 50,
  a_cada_n integer not null default 3,
  updated_at timestamptz not null default now(),
  constraint cashback_config_singleton check (id = 1),
  constraint cashback_config_percentual_range check (percentual >= 0 and percentual <= 50),
  constraint cashback_config_modo check (modo in ('livre', 'sempre', 'teto', 'a_cada_n')),
  constraint cashback_config_teto_range check (teto_valor > 0 and teto_valor <= 100000),
  constraint cashback_config_n_range check (a_cada_n >= 1 and a_cada_n <= 100)
);

insert into public.cashback_config (id) values (1) on conflict (id) do nothing;

alter table public.cashback_config enable row level security;

drop policy if exists "cashback_config_select_public" on public.cashback_config;
create policy "cashback_config_select_public"
  on public.cashback_config for select
  to anon, authenticated
  using (true);

drop policy if exists "cashback_config_update_admin" on public.cashback_config;
create policy "cashback_config_update_admin"
  on public.cashback_config for update
  to authenticated
  using (exists (select 1 from public.profiles pr where pr.id = (select auth.uid()) and pr.role = 'admin'))
  with check (exists (select 1 from public.profiles pr where pr.id = (select auth.uid()) and pr.role = 'admin'));

-- Percentual agora vem da configuração (deixa de ser immutable).
create or replace function public.cashback_percentual()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select percentual from public.cashback_config where id = 1), 2.5)::numeric;
$$;

/**
 * Se o cliente é obrigado a usar o saldo na próxima compra, conforme a regra do admin.
 * Conta como "compra sem usar" cada crédito de cashback (compra paga) não estornado
 * depois do último uso não estornado.
 */
create or replace function public.cashback_uso_obrigatorio(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cfg public.cashback_config%rowtype;
  v_saldo numeric(12, 2);
  v_ultimo_uso timestamptz;
  v_compras integer;
begin
  select * into v_cfg from public.cashback_config where id = 1;
  if not found or v_cfg.modo = 'livre' then
    return false;
  end if;

  v_saldo := public.cashback_saldo(p_user_id);
  if v_saldo <= 0 then
    return false;
  end if;

  if v_cfg.modo = 'sempre' then
    return true;
  end if;

  if v_cfg.modo = 'teto' then
    return v_saldo >= v_cfg.teto_valor;
  end if;

  -- a_cada_n
  select max(u.created_at) into v_ultimo_uso
  from public.cashback_transacoes u
  where u.user_id = p_user_id
    and u.tipo = 'uso'
    and not exists (
      select 1 from public.cashback_transacoes e
      where e.pedido_id = u.pedido_id and e.tipo = 'estorno_uso'
    );

  select count(*) into v_compras
  from public.cashback_transacoes c
  where c.user_id = p_user_id
    and c.tipo = 'credito'
    and (v_ultimo_uso is null or c.created_at > v_ultimo_uso)
    and not exists (
      select 1 from public.cashback_transacoes e
      where e.pedido_id = c.pedido_id and e.tipo = 'estorno_credito'
    );

  return v_compras >= v_cfg.a_cada_n - 1;
end;
$$;

revoke all on function public.cashback_uso_obrigatorio(uuid) from public;
grant execute on function public.cashback_uso_obrigatorio(uuid) to service_role;

/** Regra do usuário logado (para o checkout). */
create or replace function public.meu_cashback_uso_obrigatorio()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.cashback_uso_obrigatorio(auth.uid());
$$;

revoke all on function public.meu_cashback_uso_obrigatorio() from public;
grant execute on function public.meu_cashback_uso_obrigatorio() to authenticated;
