-- Loja aberta para visitantes (false = página «em construção», controlável pelo admin).

alter table public.site_layout
  add column if not exists loja_publica boolean not null default true;