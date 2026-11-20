"use server";

import { revalidatePath } from "next/cache";

import { cifrarSenha, decifrarSenha } from "@/features/contas-servicos/services/credenciaisCrypto";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/services/supabase/admin";

export type ContaServico = {
  id: string;
  servico: string;
  email: string;
  temSenha: boolean;
  link_login: string;
  link_recarga: string;
  observacoes: string;
};

export type Resultado = { ok: boolean; message: string };

const MIGRACAO = " Rode a migração `20261120120000_admin_contas_servicos` no Supabase.";

function linkSeguro(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function listarContasServicos(): Promise<{ contas: ContaServico[]; erro: string | null }> {
  await requireAdmin();
  const { data, error } = await createAdminClient()
    .from("admin_contas_servicos")
    .select("id, servico, email, senha_cifrada, link_login, link_recarga, observacoes")
    .order("ordem")
    .order("servico");
  if (error) return { contas: [], erro: error.message + (error.message.includes("admin_contas_servicos") ? MIGRACAO : "") };
  return {
    erro: null,
    contas: (data ?? []).map((r) => ({
      id: r.id,
      servico: r.servico,
      email: r.email ?? "",
      temSenha: Boolean(r.senha_cifrada),
      link_login: r.link_login ?? "",
      link_recarga: r.link_recarga ?? "",
      observacoes: r.observacoes ?? "",
    })),
  };
}

/** `senha` vazia mantém a atual; `removerSenha` apaga. `id` vazio cria uma conta nova. */
export async function salvarContaServico(form: {
  id: string;
  servico: string;
  email: string;
  senha: string;
  removerSenha: boolean;
  link_login: string;
  link_recarga: string;
  observacoes: string;
}): Promise<Resultado> {
  await requireAdmin();
  const servico = form.servico.trim().slice(0, 80);
  if (!servico) return { ok: false, message: "Informe o nome do serviço." };

  const linha: Record<string, unknown> = {
    servico,
    email: form.email.trim().slice(0, 200) || null,
    link_login: linkSeguro(form.link_login),
    link_recarga: linkSeguro(form.link_recarga),
    observacoes: form.observacoes.trim().slice(0, 2000) || null,
    updated_at: new Date().toISOString(),
  };
  try {
    if (form.removerSenha) linha.senha_cifrada = null;
    else if (form.senha) linha.senha_cifrada = cifrarSenha(form.senha.slice(0, 500));
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha ao proteger a senha." };
  }

  const admin = createAdminClient();
  const { error } = form.id
    ? await admin.from("admin_contas_servicos").update(linha).eq("id", form.id)
    : await admin.from("admin_contas_servicos").insert({ ...linha, ordem: 99 });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/contas");
  return { ok: true, message: "Conta salva." };
}

export async function excluirContaServico(id: string): Promise<Resultado> {
  await requireAdmin();
  const { error } = await createAdminClient().from("admin_contas_servicos").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/contas");
  return { ok: true, message: "Conta removida." };
}

/** Devolve a senha em texto só para um admin, sob demanda (botão "Mostrar"). */
export async function revelarSenhaContaServico(id: string): Promise<{ ok: boolean; senha?: string; message?: string }> {
  await requireAdmin();
  const { data, error } = await createAdminClient()
    .from("admin_contas_servicos")
    .select("senha_cifrada")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data?.senha_cifrada) return { ok: false, message: "Nenhuma senha salva." };
  try {
    return { ok: true, senha: decifrarSenha(data.senha_cifrada) };
  } catch {
    return { ok: false, message: "Não foi possível abrir a senha (a chave ADMIN_CREDENCIAIS_KEY mudou?)." };
  }
}
