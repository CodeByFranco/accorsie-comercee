-- Acessos das contas de serviços externos (Melhor Envio, API de placas…), vistos em admin > Contas.
-- A senha é gravada criptografada (AES-256-GCM) pelo servidor com a chave ADMIN_CREDENCIAIS_KEY.
-- Sem políticas de RLS: só o service role (servidor) lê e grava.

create table if not exists public.admin_contas_servicos (
  id uuid primary key default gen_random_uuid(),
  servico text not null,
  email text,
  senha_cifrada text,
  link_login text,
  link_recarga text,
  observacoes text,
  ordem int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.admin_contas_servicos enable row level security;

insert into public.admin_contas_servicos (servico, link_login, link_recarga, ordem)
select * from (values
  ('Melhor Envio', 'https://melhorenvio.com.br/login', 'https://melhorenvio.com.br/painel/gerenciar/carteira', 1),
  ('API de placas', null, null, 2)
) as v(servico, link_login, link_recarga, ordem)
where not exists (select 1 from public.admin_contas_servicos);
