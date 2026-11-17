-- Faixas de parcelamento sem juros configuráveis no admin (Financeiro).
-- Abaixo da menor faixa o cartão é à vista. A faixa vigente é a de maior valor_minimo <= preço.

create table if not exists public.parcelamento_faixas (
  id uuid primary key default gen_random_uuid(),
  valor_minimo numeric(12, 2) not null,
  max_parcelas smallint not null,
  created_at timestamptz not null default now(),
  constraint parcelamento_faixas_valor_minimo_unique unique (valor_minimo),
  constraint parcelamento_faixas_valor_minimo_positive check (valor_minimo > 0),
  constraint parcelamento_faixas_max_parcelas_range check (max_parcelas >= 2 and max_parcelas <= 12)
);

comment on table public.parcelamento_faixas is
  'Teto de parcelas sem juros por valor mínimo do pedido/produto. Editável em /admin/financeiro.';

alter table public.parcelamento_faixas enable row level security;

drop policy if exists "parcelamento_faixas_select_public" on public.parcelamento_faixas;
create policy "parcelamento_faixas_select_public"
  on public.parcelamento_faixas for select
  to anon, authenticated
  using (true);

drop policy if exists "parcelamento_faixas_insert_admin" on public.parcelamento_faixas;
create policy "parcelamento_faixas_insert_admin"
  on public.parcelamento_faixas for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles pr
      where pr.id = (select auth.uid()) and pr.role = 'admin'
    )
  );

drop policy if exists "parcelamento_faixas_update_admin" on public.parcelamento_faixas;
create policy "parcelamento_faixas_update_admin"
  on public.parcelamento_faixas for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles pr
      where pr.id = (select auth.uid()) and pr.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles pr
      where pr.id = (select auth.uid()) and pr.role = 'admin'
    )
  );

drop policy if exists "parcelamento_faixas_delete_admin" on public.parcelamento_faixas;
create policy "parcelamento_faixas_delete_admin"
  on public.parcelamento_faixas for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles pr
      where pr.id = (select auth.uid()) and pr.role = 'admin'
    )
  );

grant select on public.parcelamento_faixas to anon, authenticated;
grant insert, update, delete on public.parcelamento_faixas to authenticated;

insert into public.parcelamento_faixas (valor_minimo, max_parcelas)
values (100, 2), (500, 6)
on conflict (valor_minimo) do nothing;
