-- Frete grátis: entrega com p_frete = 0 só é aceita quando os produtos (já com desconto
-- de kit e cupom) somam ao menos R$ 199,00. Mesmo valor de FRETE_GRATIS_MINIMO no front.

create or replace function public.criar_pedido_checkout(
  p_itens jsonb,
  p_frete numeric,
  p_destinatario_nome text,
  p_telefone text,
  p_cep text,
  p_logradouro text,
  p_numero text,
  p_complemento text,
  p_bairro text,
  p_cidade text,
  p_uf text,
  p_forma_pagamento text,
  p_destinatario_documento text default null,
  p_retirada_loja boolean default false,
  p_cupom_codigo text default null,
  p_kits jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_temp, public
as $$
declare
  v_uid uuid;
  v_pedido_id uuid;
  v_subtotal numeric(12, 2);
  v_frete numeric(12, 2);
  v_base numeric(12, 2);
  v_desconto_cupom numeric(12, 2);
  v_desconto_kit numeric(12, 2);
  v_cupom_id uuid;
  v_total numeric(12, 2);
  v_forma text;
  v_retirada boolean;
  v_calc jsonb;
  r_item record;
  v_kit_id uuid;
  v_kit record;
  v_kit_normal numeric(12, 2);
  v_kit_preco numeric(12, 2);
  v_kit_economia numeric(12, 2);
  v_kits_snapshot jsonb := '[]'::jsonb;
  v_need int;
  v_avail int;
  r_kit record;
  r_escolha record;
  v_kits_vistos uuid[] := '{}';
  v_escolhas_snapshot jsonb;
  v_sel_pid uuid;
  v_sel_q int;
  v_combo record;
  v_padrao boolean;
  v_tem_combo boolean;
  v_pct numeric;
  v_kit_sub numeric(12, 2);
  v_prod_titulo text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Sessão obrigatória para criar pedido.';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe ao menos um item no pedido.';
  end if;

  v_retirada := coalesce(p_retirada_loja, false);
  if v_retirada then
    v_frete := 0;
  else
    v_frete := coalesce(p_frete, 0);
  end if;

  if v_frete < 0 then
    raise exception 'Frete inválido.';
  end if;

  v_forma := lower(btrim(coalesce(p_forma_pagamento, '')));
  if v_forma not in ('pix', 'cartao') then
    v_forma := 'cartao';
  end if;

  if nullif(btrim(p_destinatario_nome), '') is null
     or nullif(btrim(p_telefone), '') is null
     or nullif(btrim(p_cep), '') is null
     or nullif(btrim(p_logradouro), '') is null
     or nullif(btrim(p_numero), '') is null
     or nullif(btrim(p_bairro), '') is null
     or nullif(btrim(p_cidade), '') is null
     or nullif(btrim(p_uf), '') is null
  then
    raise exception 'Preencha todos os dados obrigatórios de entrega.';
  end if;

  create temporary table tmp_pedido_linhas (
    produto_id uuid not null primary key,
    quantidade int not null check (quantidade > 0)
  ) on commit drop;

  create temporary table tmp_kit_linhas (
    produto_id uuid not null primary key,
    quantidade int not null check (quantidade > 0)
  ) on commit drop;

  create temporary table tmp_kit_pool (
    produto_id uuid not null primary key,
    quantidade int not null check (quantidade >= 0)
  ) on commit drop;

  for r_item in
    select e.elem as el
    from jsonb_array_elements(p_itens) as e(elem)
  loop
    declare
      v_pid uuid;
      v_q int;
    begin
      if jsonb_typeof(r_item.el) <> 'object' then
        raise exception 'Formato inválido dos itens do pedido.';
      end if;
      v_pid := nullif(btrim(r_item.el->>'produto_id'), '')::uuid;
      if v_pid is null then
        raise exception 'Cada item deve ter produto_id válido.';
      end if;
      begin
        v_q := (r_item.el->>'quantidade')::int;
      exception
        when others then
          raise exception 'Quantidade inválida para o produto %.', v_pid;
      end;
      if v_q is null or v_q <= 0 then
        raise exception 'Quantidade deve ser maior que zero.';
      end if;

      insert into tmp_pedido_linhas (produto_id, quantidade)
      values (v_pid, v_q)
      on conflict (produto_id) do update
        set quantidade = tmp_pedido_linhas.quantidade + excluded.quantidade;
    end;
  end loop;

  insert into tmp_kit_pool (produto_id, quantidade)
  select produto_id, quantidade from tmp_pedido_linhas;

  perform 1
  from public.produtos p
  inner join tmp_pedido_linhas l on l.produto_id = p.id
  order by p.id
  for update;

  select round(coalesce(sum(
    round(
      p.valor::numeric * (1 - (
        case v_forma
          when 'pix' then least(coalesce(p.desconto_pix_percent, 0), 100) / 100.0
          else least(coalesce(p.desconto_cartao_percent, 0), 100) / 100.0
        end
      )),
      2
    ) * l.quantidade
  ), 0), 2)::numeric(12, 2)
    into v_subtotal
  from tmp_pedido_linhas l
  inner join public.produtos p on p.id = l.produto_id;

  if exists (
    select 1
    from tmp_pedido_linhas l
    left join public.produtos p on p.id = l.produto_id
    where p.id is null
  ) then
    raise exception 'Um ou mais produtos não foram encontrados.';
  end if;

  if exists (
    select 1
    from tmp_pedido_linhas l
    inner join public.produtos p on p.id = l.produto_id
    where coalesce(p.status, 'draft') is distinct from 'published'
  ) then
    raise exception 'Um ou mais produtos não estão disponíveis para compra.';
  end if;

  if exists (
    select 1
    from tmp_pedido_linhas l
    inner join public.produtos p on p.id = l.produto_id
    where p.valor is null
  ) then
    raise exception 'Um ou mais produtos estão com preço incompleto.';
  end if;

  if exists (
    select 1
    from tmp_pedido_linhas l
    inner join public.produtos p on p.id = l.produto_id
    where p.quantidade_estoque < l.quantidade
  ) then
    raise exception 'Estoque insuficiente para um ou mais itens.';
  end if;

  if exists (
    select 1
    from tmp_pedido_linhas l
    inner join public.produtos p on p.id = l.produto_id
    where coalesce(p.somente_retirada_loja, false) = true
  ) and not v_retirada then
    raise exception 'O pedido contém produtos disponíveis apenas para retirada na loja.';
  end if;

  -- Kits: validar composição (fixos + escolhas do cliente) e somar economia (sobre preço de catálogo)
  v_desconto_kit := 0;

  if p_kits is not null and jsonb_typeof(p_kits) = 'array' then
    for r_kit in
      select e.elem as el
      from jsonb_array_elements(p_kits) as e(elem)
    loop
      if jsonb_typeof(r_kit.el) <> 'object' then
        raise exception 'Formato inválido dos kits do pedido.';
      end if;

      -- Combo de produto "Kit filtros" + óleo à escolha (desconto do combo sobre tudo)
      if nullif(btrim(r_kit.el->>'produto_id'), '') is not null then
        v_kit_id := (r_kit.el->>'produto_id')::uuid;
        if v_kit_id = any(v_kits_vistos) then
          continue;
        end if;
        v_kits_vistos := v_kits_vistos || v_kit_id;

        select c.* into v_combo from public.kit_combo c where c.id = 1;
        if not coalesce(v_combo.ativo, false) then
          raise exception 'Combo com óleo indisponível no momento.';
        end if;

        select p.titulo into v_prod_titulo
        from public.produtos p
        where p.id = v_kit_id
          and coalesce(p.status, 'draft') = 'published'
          and p.titulo ilike 'kit filtros%';
        if v_prod_titulo is null then
          raise exception 'Este produto não aceita combo com óleo.';
        end if;

        v_sel_pid := null;
        v_sel_q := null;
        begin
          select nullif(btrim(s.sel->>'product_id'), '')::uuid, (s.sel->>'quantidade')::int
            into v_sel_pid, v_sel_q
          from jsonb_array_elements(
            case when jsonb_typeof(r_kit.el->'escolhas') = 'array' then r_kit.el->'escolhas' else '[]'::jsonb end
          ) as s(sel)
          where s.sel->>'kit_item_id' = 'combo'
          limit 1;
        exception
          when others then
            raise exception 'Combo inválido para %.', v_prod_titulo;
        end;

        if v_sel_pid is null then
          raise exception 'Escolha o óleo do combo de %.', v_prod_titulo;
        end if;
        if not exists (select 1 from public.kit_combo_opcoes o where o.product_id = v_sel_pid) then
          raise exception 'Produto escolhido não faz parte do combo.';
        end if;
        if v_sel_q is null or v_sel_q < v_combo.qtd_min or v_sel_q > v_combo.qtd_max then
          raise exception 'Quantidade de "%" deve ficar entre % e %.', v_combo.nome, v_combo.qtd_min, v_combo.qtd_max;
        end if;

        truncate tmp_kit_linhas;
        insert into tmp_kit_linhas (produto_id, quantidade) values (v_kit_id, 1);
        insert into tmp_kit_linhas (produto_id, quantidade)
        values (v_sel_pid, v_sel_q)
        on conflict (produto_id) do update
          set quantidade = tmp_kit_linhas.quantidade + excluded.quantidade;

        for r_item in
          select l.produto_id, l.quantidade
          from tmp_kit_linhas l
        loop
          v_need := r_item.quantidade;
          select coalesce(quantidade, 0) into v_avail
          from tmp_kit_pool
          where produto_id = r_item.produto_id;

          if coalesce(v_avail, 0) < v_need then
            raise exception 'Carrinho incompleto para o combo de %.', v_prod_titulo;
          end if;

          update tmp_kit_pool
            set quantidade = quantidade - v_need
          where produto_id = r_item.produto_id;
        end loop;

        select round(coalesce(sum(p.valor::numeric * l.quantidade), 0), 2)
          into v_kit_normal
        from tmp_kit_linhas l
        inner join public.produtos p on p.id = l.produto_id;

        select round(coalesce(sum(
          round(
            p.valor::numeric * (1 - (
              case v_forma
                when 'pix' then least(coalesce(p.desconto_pix_percent, 0), 100) / 100.0
                else least(coalesce(p.desconto_cartao_percent, 0), 100) / 100.0
              end
            )),
            2
          ) * l.quantidade
        ), 0), 2)
          into v_kit_sub
        from tmp_kit_linhas l
        inner join public.produtos p on p.id = l.produto_id;

        v_pct := case v_forma when 'pix' then v_combo.combo_desconto_pix else v_combo.combo_desconto_cartao end;
        v_pct := least(greatest(coalesce(v_pct, 0), 0), 100);
        v_kit_preco := round(v_kit_normal * (1 - v_pct / 100.0), 2);
        v_kit_economia := round(greatest(0, v_kit_sub - v_kit_preco), 2);
        v_desconto_kit := round(v_desconto_kit + v_kit_economia, 2);

        v_kits_snapshot := v_kits_snapshot || jsonb_build_array(jsonb_build_object(
          'produto_id', v_kit_id,
          'nome', 'Combo: ' || v_prod_titulo,
          'desconto', v_kit_economia,
          'escolhas', jsonb_build_array(jsonb_build_object(
            'kit_item_id', 'combo',
            'nome', coalesce(v_combo.nome, 'Combo'),
            'product_id', v_sel_pid,
            'quantidade', v_sel_q
          ))
        ));
        continue;
      end if;

      v_kit_id := nullif(btrim(r_kit.el->>'kit_id'), '')::uuid;
      if v_kit_id is null or v_kit_id = any(v_kits_vistos) then
        continue;
      end if;
      v_kits_vistos := v_kits_vistos || v_kit_id;

      select k.* into v_kit
      from public.kits k
      where k.id = v_kit_id;

      if not found or coalesce(v_kit.status, 'draft') is distinct from 'published' then
        raise exception 'Um ou mais kits não estão disponíveis.';
      end if;

      if not exists (select 1 from public.kit_items ki where ki.kit_id = v_kit_id) then
        raise exception 'Kit % está sem itens.', coalesce(v_kit.nome, v_kit_id::text);
      end if;

      truncate tmp_kit_linhas;

      insert into tmp_kit_linhas (produto_id, quantidade)
      select ki.product_id, ki.quantidade
      from public.kit_items ki
      where ki.kit_id = v_kit_id
        and ki.tipo = 'fixo'
      on conflict (produto_id) do update
        set quantidade = tmp_kit_linhas.quantidade + excluded.quantidade;

      v_escolhas_snapshot := '[]'::jsonb;

      for r_escolha in
        select ki.id, ki.nome, ki.qtd_min, ki.qtd_max
        from public.kit_items ki
        where ki.kit_id = v_kit_id
          and ki.tipo = 'escolha'
      loop
        v_sel_pid := null;
        v_sel_q := null;

        begin
          select nullif(btrim(s.sel->>'product_id'), '')::uuid, (s.sel->>'quantidade')::int
            into v_sel_pid, v_sel_q
          from jsonb_array_elements(
            case when jsonb_typeof(r_kit.el->'escolhas') = 'array' then r_kit.el->'escolhas' else '[]'::jsonb end
          ) as s(sel)
          where s.sel->>'kit_item_id' = r_escolha.id::text
          limit 1;
        exception
          when others then
            raise exception 'Escolha inválida no kit %.', coalesce(v_kit.nome, v_kit_id::text);
        end;

        if v_sel_pid is null or v_sel_q is null then
          raise exception 'Escolha "%" pendente no kit %.',
            coalesce(r_escolha.nome, 'opção'), coalesce(v_kit.nome, v_kit_id::text);
        end if;

        if not exists (
          select 1 from public.kit_item_opcoes o
          where o.kit_item_id = r_escolha.id and o.product_id = v_sel_pid
        ) then
          raise exception 'Produto escolhido não é uma opção válida do kit %.', coalesce(v_kit.nome, v_kit_id::text);
        end if;

        if v_sel_q < r_escolha.qtd_min or v_sel_q > r_escolha.qtd_max then
          raise exception 'Quantidade de "%" deve ficar entre % e % no kit %.',
            coalesce(r_escolha.nome, 'opção'), r_escolha.qtd_min, r_escolha.qtd_max,
            coalesce(v_kit.nome, v_kit_id::text);
        end if;

        insert into tmp_kit_linhas (produto_id, quantidade)
        values (v_sel_pid, v_sel_q)
        on conflict (produto_id) do update
          set quantidade = tmp_kit_linhas.quantidade + excluded.quantidade;

        v_escolhas_snapshot := v_escolhas_snapshot || jsonb_build_array(jsonb_build_object(
          'kit_item_id', r_escolha.id,
          'nome', coalesce(r_escolha.nome, ''),
          'product_id', v_sel_pid,
          'quantidade', v_sel_q
        ));
      end loop;

      v_padrao := coalesce(v_kit.usa_desconto_padrao, true);
      v_tem_combo := false;
      select c.* into v_combo from public.kit_combo c where c.id = 1;

      -- Combo global (ex.: óleo à escolha), enviado como escolha 'combo'
      v_sel_pid := null;
      v_sel_q := null;
      begin
        select nullif(btrim(s.sel->>'product_id'), '')::uuid, (s.sel->>'quantidade')::int
          into v_sel_pid, v_sel_q
        from jsonb_array_elements(
          case when jsonb_typeof(r_kit.el->'escolhas') = 'array' then r_kit.el->'escolhas' else '[]'::jsonb end
        ) as s(sel)
        where s.sel->>'kit_item_id' = 'combo'
        limit 1;
      exception
        when others then
          raise exception 'Combo inválido no kit %.', coalesce(v_kit.nome, v_kit_id::text);
      end;

      if v_sel_pid is not null then
        if not v_padrao or not coalesce(v_combo.ativo, false) then
          raise exception 'Combo indisponível para o kit %.', coalesce(v_kit.nome, v_kit_id::text);
        end if;
        if not exists (select 1 from public.kit_combo_opcoes o where o.product_id = v_sel_pid) then
          raise exception 'Produto escolhido não faz parte do combo.';
        end if;
        if v_sel_q is null or v_sel_q < v_combo.qtd_min or v_sel_q > v_combo.qtd_max then
          raise exception 'Quantidade de "%" deve ficar entre % e %.', v_combo.nome, v_combo.qtd_min, v_combo.qtd_max;
        end if;

        insert into tmp_kit_linhas (produto_id, quantidade)
        values (v_sel_pid, v_sel_q)
        on conflict (produto_id) do update
          set quantidade = tmp_kit_linhas.quantidade + excluded.quantidade;

        v_escolhas_snapshot := v_escolhas_snapshot || jsonb_build_array(jsonb_build_object(
          'kit_item_id', 'combo',
          'nome', coalesce(v_combo.nome, 'Combo'),
          'product_id', v_sel_pid,
          'quantidade', v_sel_q
        ));
        v_tem_combo := true;
      end if;

      -- Verificar e alocar quantidades no carrinho
      for r_item in
        select l.produto_id, l.quantidade
        from tmp_kit_linhas l
      loop
        v_need := r_item.quantidade;
        select coalesce(quantidade, 0) into v_avail
        from tmp_kit_pool
        where produto_id = r_item.produto_id;

        if coalesce(v_avail, 0) < v_need then
          raise exception 'Carrinho incompleto para o kit %.', coalesce(v_kit.nome, v_kit_id::text);
        end if;

        update tmp_kit_pool
          set quantidade = quantidade - v_need
        where produto_id = r_item.produto_id;
      end loop;

      select round(coalesce(sum(p.valor::numeric * l.quantidade), 0), 2)
        into v_kit_normal
      from tmp_kit_linhas l
      inner join public.produtos p on p.id = l.produto_id;

      if v_padrao then
        -- Desconto padrão por forma de pagamento sobre o preço de catálogo;
        -- a economia é medida contra o subtotal (que já tem o desconto PIX/cartão do produto).
        if v_tem_combo then
          v_pct := case v_forma when 'pix' then v_combo.combo_desconto_pix else v_combo.combo_desconto_cartao end;
        else
          v_pct := case v_forma when 'pix' then v_combo.kit_desconto_pix else v_combo.kit_desconto_cartao end;
        end if;
        v_pct := least(greatest(coalesce(v_pct, 0), 0), 100);

        select round(coalesce(sum(
          round(
            p.valor::numeric * (1 - (
              case v_forma
                when 'pix' then least(coalesce(p.desconto_pix_percent, 0), 100) / 100.0
                else least(coalesce(p.desconto_cartao_percent, 0), 100) / 100.0
              end
            )),
            2
          ) * l.quantidade
        ), 0), 2)
          into v_kit_sub
        from tmp_kit_linhas l
        inner join public.produtos p on p.id = l.produto_id;

        v_kit_preco := round(v_kit_normal * (1 - v_pct / 100.0), 2);
        v_kit_economia := round(greatest(0, v_kit_sub - v_kit_preco), 2);
      else
        if v_kit.tipo_desconto = 'preco_fixo' then
          v_kit_preco := round(coalesce(v_kit.preco_final, 0), 2);
        elsif v_kit.tipo_desconto = 'valor_fixo' then
          v_kit_preco := round(greatest(0, v_kit_normal - coalesce(v_kit.valor_desconto, 0)), 2);
        else
          v_kit_preco := round(
            v_kit_normal * (1 - least(coalesce(v_kit.valor_desconto, 0), 100) / 100.0),
            2
          );
        end if;
        if v_kit_preco < 0 then
          v_kit_preco := 0;
        end if;
        v_kit_economia := round(greatest(0, v_kit_normal - v_kit_preco), 2);
      end if;

      v_desconto_kit := round(v_desconto_kit + v_kit_economia, 2);

      v_kits_snapshot := v_kits_snapshot || jsonb_build_array(jsonb_build_object(
        'kit_id', v_kit_id,
        'nome', coalesce(v_kit.nome, ''),
        'desconto', v_kit_economia,
        'escolhas', v_escolhas_snapshot
      ));
    end loop;
  end if;

  if v_desconto_kit > v_subtotal then
    v_desconto_kit := v_subtotal;
  end if;

  v_base := round(v_subtotal + v_frete - v_desconto_kit, 2)::numeric(12, 2);
  if v_base < 0 then
    v_base := 0;
  end if;

  v_desconto_cupom := 0;
  v_cupom_id := null;

  if p_cupom_codigo is not null and length(trim(p_cupom_codigo)) > 0 then
    v_calc := public.calcular_cupom_desconto(p_cupom_codigo, v_base);
    if coalesce((v_calc->>'ok')::boolean, false) is distinct from true then
      raise exception '%', coalesce(v_calc->>'message', 'Cupom inválido.');
    end if;
    v_desconto_cupom := round(coalesce((v_calc->>'desconto')::numeric, 0), 2)::numeric(12, 2);
    if (v_calc ? 'cupom_id') and v_calc->>'cupom_id' is not null then
      v_cupom_id := (v_calc->>'cupom_id')::uuid;
    end if;
  end if;

  if v_desconto_cupom < 0 then
    v_desconto_cupom := 0;
  end if;

  if v_desconto_cupom > v_base then
    v_desconto_cupom := v_base;
  end if;

  if not v_retirada and v_frete = 0
     and round(v_subtotal - v_desconto_kit - v_desconto_cupom, 2) < 199 then
    raise exception 'Frete grátis disponível apenas para pedidos a partir de R$ 199,00.';
  end if;

  v_total := round(v_base - v_desconto_cupom, 2)::numeric(12, 2);

  if v_total <= 0 then
    raise exception 'O valor final do pedido deve ser maior que zero.';
  end if;

  insert into public.pedidos (
    user_id,
    status,
    subtotal,
    frete,
    total,
    desconto_cupom,
    desconto_kit,
    kits_snapshot,
    cupom_id,
    destinatario_nome,
    telefone,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    retirada_loja,
    destinatario_documento
  )
  values (
    v_uid,
    'aguardando_pagamento',
    v_subtotal,
    v_frete,
    v_total,
    v_desconto_cupom,
    v_desconto_kit,
    case when jsonb_array_length(v_kits_snapshot) > 0 then v_kits_snapshot else null end,
    v_cupom_id,
    btrim(p_destinatario_nome),
    btrim(p_telefone),
    btrim(p_cep),
    btrim(p_logradouro),
    btrim(p_numero),
    nullif(btrim(p_complemento), ''),
    btrim(p_bairro),
    btrim(p_cidade),
    upper(btrim(p_uf)),
    v_retirada,
    nullif(btrim(p_destinatario_documento), '')
  )
  returning id into v_pedido_id;

  insert into public.pedido_itens (
    pedido_id,
    produto_id,
    quantidade,
    preco_unitario,
    titulo_snapshot,
    cod_produto_snapshot
  )
  select
    v_pedido_id,
    l.produto_id,
    l.quantidade,
    round(
      p.valor::numeric * (1 - (
        case v_forma
          when 'pix' then least(coalesce(p.desconto_pix_percent, 0), 100) / 100.0
          else least(coalesce(p.desconto_cartao_percent, 0), 100) / 100.0
        end
      )),
      2
    )::numeric(12, 2),
    coalesce(p.titulo, ''),
    coalesce(p.cod_produto, '')
  from tmp_pedido_linhas l
  inner join public.produtos p on p.id = l.produto_id;

  if v_cupom_id is not null then
    update public.cupons
      set usos_count = usos_count + 1
    where id = v_cupom_id;
  end if;

  return v_pedido_id;
end;
$$;

comment on function public.criar_pedido_checkout is
  'Cria pedido + itens; desconto PIX/cartão; kits (p_kits, escolhas, combo, desconto padrão PIX/cartão e combo Kit filtros + óleo); cupom; retirada; frete grátis a partir de R$ 199; published only.';

revoke all on function public.criar_pedido_checkout(
  jsonb, numeric, text, text, text, text, text, text, text, text, text, text, text, boolean, text, jsonb
) from public;

grant execute on function public.criar_pedido_checkout(
  jsonb, numeric, text, text, text, text, text, text, text, text, text, text, text, boolean, text, jsonb
) to authenticated, service_role;
