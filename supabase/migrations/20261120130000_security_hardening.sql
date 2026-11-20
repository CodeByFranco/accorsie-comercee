-- Auditoria de segurança (2026-11-20).
--
-- 1) No Supabase, toda função/tabela nova em `public` recebe GRANT explícito para `anon` e
--    `authenticated` (default privileges). `revoke ... from public` NÃO remove esses grants.
--    Resultado: funções internas (ex.: mercadopago_aplicar_estado_pagamento) estavam chamáveis
--    por qualquer visitante com a anon key (que fica no código da página).
-- 2) Bucket product-images: qualquer usuário logado (cliente) podia enviar/apagar imagens.
-- 3) Tabelas de cota de placa sem RLS.
-- 4) Limite anti-bot de pedidos aguardando pagamento por cliente.

-- ---------------------------------------------------------------------------
-- 1) Funções: tira tudo de anon/authenticated e devolve só o necessário.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- Novas funções criadas no futuro não ficam mais expostas automaticamente.
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

grant execute on function public.criar_pedido_checkout(
  jsonb, numeric, text, text, text, text, text, text, text, text, text, text, text, boolean, text, jsonb
) to authenticated;
grant execute on function public.aplicar_cashback_pedido(uuid, numeric) to authenticated;
grant execute on function public.meu_saldo_cashback() to authenticated;
grant execute on function public.calcular_cupom_desconto(text, numeric) to authenticated;
grant execute on function public.cashback_percentual() to authenticated;

-- Garante que o backend (service_role) continua com acesso a tudo.
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------
-- 2) Storage product-images: escrita só para admin.
-- ---------------------------------------------------------------------------
drop policy if exists "product_images_insert_authenticated" on storage.objects;
drop policy if exists "product_images_update_authenticated" on storage.objects;
drop policy if exists "product_images_delete_authenticated" on storage.objects;
drop policy if exists "product_images_insert_anon" on storage.objects;
drop policy if exists "product_images_delete_anon" on storage.objects;
drop policy if exists "product_images_insert_admin" on storage.objects;
drop policy if exists "product_images_update_admin" on storage.objects;
drop policy if exists "product_images_delete_admin" on storage.objects;

create policy "product_images_insert_admin"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "product_images_update_admin"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  )
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "product_images_delete_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 3) Tabelas internas: RLS ligado e sem acesso para anon/authenticated.
-- ---------------------------------------------------------------------------
alter table public.placa_consulta_usuario_dia enable row level security;
alter table public.placa_consulta_anon enable row level security;
revoke all on table public.placa_consulta_usuario_dia from anon, authenticated;
revoke all on table public.placa_consulta_anon from anon, authenticated;
revoke all on table public.admin_access_log from anon, authenticated;
revoke all on table public.melhor_envio_credentials from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Anti-bot: no máximo 5 pedidos aguardando pagamento por cliente na última hora.
-- ---------------------------------------------------------------------------
create or replace function public.pedidos_limitar_pendentes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('pedido_limite:' || new.user_id::text));

  if (
    select count(*)
    from public.pedidos
    where user_id = new.user_id
      and status = 'aguardando_pagamento'::public.pedido_status
      and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Muitos pedidos pendentes. Finalize ou aguarde antes de criar outro.';
  end if;

  return new;
end;
$$;

revoke execute on function public.pedidos_limitar_pendentes() from public, anon, authenticated;

drop trigger if exists pedidos_limitar_pendentes on public.pedidos;
create trigger pedidos_limitar_pendentes
  before insert on public.pedidos
  for each row
  execute function public.pedidos_limitar_pendentes();
