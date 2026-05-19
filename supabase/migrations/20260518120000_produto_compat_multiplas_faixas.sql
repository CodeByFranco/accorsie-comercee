-- Permite várias faixas de anos por produto+modelo (buracos entre anos).
-- Remove a PK atual (nome pode ser produto_compatibilidades_pk ou produto_compatibilidades_pkey).

alter table public.produto_compatibilidades
  drop constraint if exists produto_compatibilidades_pk;

alter table public.produto_compatibilidades
  drop constraint if exists produto_compatibilidades_pkey;

do $$
declare
  pk_name text;
begin
  select c.conname into pk_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'produto_compatibilidades'
    and c.contype = 'p';

  if pk_name is not null then
    execute format(
      'alter table public.produto_compatibilidades drop constraint %I',
      pk_name
    );
  end if;
end $$;

alter table public.produto_compatibilidades
  add constraint produto_compatibilidades_pk
  primary key (produto_id, modelo_id, ano_inicio);

comment on table public.produto_compatibilidades is
  'Faixas de anos do veículo em que o produto se aplica; várias linhas por modelo para lacunas (ex.: 2015-2016 e 2018-2020).';
