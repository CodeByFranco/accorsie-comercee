-- Blocos editáveis da página "Quem somos" (admin > Layout > Página Sobre).
-- null = a vitrine usa o layout padrão do código.

alter table public.site_layout
  add column if not exists sobre_blocos jsonb;
