-- Tele rápida: entrega própria da loja para CEPs da mesma cidade (ex.: Bento Gonçalves).
-- Valor e ativação editáveis em /admin/financeiro.

create table if not exists public.tele_rapida_config (
  id smallint primary key default 1,
  ativa boolean not null default true,
  valor numeric(12, 2) not null default 12.00,
  updated_at timestamptz not null default now(),
  constraint tele_rapida_config_singleton check (id = 1),
  constraint tele_rapida_config_valor_range check (valor >= 0 and valor <= 1000)
);

insert into public.tele_rapida_config (id) values (1) on conflict (id) do nothing;

alter table public.tele_rapida_config enable row level security;

drop policy if exists "tele_rapida_config_select_public" on public.tele_rapida_config;
create policy "tele_rapida_config_select_public"
  on public.tele_rapida_config for select
  to anon, authenticated
  using (true);

drop policy if exists "tele_rapida_config_update_admin" on public.tele_rapida_config;
create policy "tele_rapida_config_update_admin"
  on public.tele_rapida_config for update
  to authenticated
  using (exists (select 1 from public.profiles pr where pr.id = (select auth.uid()) and pr.role = 'admin'))
  with check (exists (select 1 from public.profiles pr where pr.id = (select auth.uid()) and pr.role = 'admin'));

alter table public.pedidos
  add column if not exists tele_rapida boolean not null default false;

comment on column public.pedidos.tele_rapida is
  'Entrega pela tele rápida da loja (sem etiqueta Melhor Envio).';

-- Horário limite (America/Sao_Paulo) para a tele rápida ser oferecida no dia.
alter table public.tele_rapida_config
  add column if not exists horario_limite time not null default '15:00';
