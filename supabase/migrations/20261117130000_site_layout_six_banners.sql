-- Até 6 banners rotativos na home (antes: 2).

alter table public.site_layout
  add column if not exists banner_3_url text not null default '',
  add column if not exists banner_4_url text not null default '',
  add column if not exists banner_5_url text not null default '',
  add column if not exists banner_6_url text not null default '';