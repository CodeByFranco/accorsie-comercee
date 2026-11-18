-- Textos institucionais editáveis no admin (Layout do site).
-- null = a vitrine usa o texto padrão do código.

alter table public.site_layout
  add column if not exists manifesto_texto text,
  add column if not exists horarios_texto text;
