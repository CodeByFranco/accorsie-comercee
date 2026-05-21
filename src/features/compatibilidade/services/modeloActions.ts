"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { slugify } from "@/utils/slugify";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseTipoVeiculoModelo } from "@/features/compatibilidade/constants/tipoVeiculoModelo";
import type { ModeloListagemItem } from "@/features/compatibilidade/components/ModelosListagemTabela";
import {
  fetchModelosAdminPaginated,
  marcaNomeFromModeloRow,
} from "@/features/compatibilidade/services/fetchModelosAdminPaginated";

export type CreateModeloState = { ok: false; message: string } | null;

export type ListModelosAdminParams = {
  marcaId?: string;
  nome?: string;
};

export type ListModelosAdminResult =
  | { ok: true; items: ModeloListagemItem[] }
  | { ok: false; message: string };

/** Lista modelos no admin com paginação completa (sem limite de 1000 por requisição). */
export async function listModelosAdmin(
  params: ListModelosAdminParams = {}
): Promise<ListModelosAdminResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { rows, error } = await fetchModelosAdminPaginated(supabase, {
    marcaId: params.marcaId,
    nome: params.nome,
  });

  if (error) {
    return { ok: false, message: error };
  }

  return {
    ok: true,
    items: rows.map((m) => ({
      modeloId: m.id,
      marcaId: m.marca_id,
      nome: m.nome,
      tipoVeiculo: m.tipo_veiculo,
      marcaNome: marcaNomeFromModeloRow(m.marcas),
    })),
  };
}

/** Slug único entre os modelos da mesma marca. `excludeModeloId` ignora a própria linha ao editar. */
async function allocateModeloSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  marcaId: string,
  baseRaw: string,
  excludeModeloId?: string
): Promise<string> {
  const base = slugify(baseRaw);
  let candidate = base;
  let n = 2;
  for (;;) {
    const { data: rows } = await supabase
      .from("modelos")
      .select("id")
      .eq("marca_id", marcaId)
      .eq("slug", candidate);
    const list = rows ?? [];
    const takenByOther = list.some((r) =>
      excludeModeloId == null ? true : r.id !== excludeModeloId
    );
    if (!takenByOther) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 200) return `${base}-${Date.now()}`;
  }
}

export async function createModelo(
  _prev: CreateModeloState,
  formData: FormData
): Promise<CreateModeloState> {
  await requireAdmin();
  const marcaId = String(formData.get("marca_id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const tipoVeiculo = parseTipoVeiculoModelo(String(formData.get("tipo_veiculo") ?? ""));

  if (!marcaId) {
    return { ok: false, message: "Escolha a marca do veículo." };
  }
  if (!nome) {
    return { ok: false, message: "Informe o nome do modelo (ex.: Civic, Gol)." };
  }
  if (!tipoVeiculo) {
    return { ok: false, message: "Escolha se o modelo é de carro, caminhão ou camionete." };
  }

  const supabase = await createClient();
  const slug = await allocateModeloSlug(supabase, marcaId, nome);

  const { error } = await supabase.from("modelos").insert({
    marca_id: marcaId,
    nome,
    slug,
    tipo_veiculo: tipoVeiculo,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "Já existe um modelo com esse nome para esta marca. Ajuste o nome ou escolha outra marca.",
      };
    }
    // CHECK constraint (Postgres 23514) — geralmente o banco ainda não aceita o novo valor
    // `camionete`. Aponta o admin para a migration que amplia o CHECK.
    if (
      error.code === "23514" ||
      error.message.includes("modelos_tipo_veiculo_check")
    ) {
      return {
        ok: false,
        message:
          tipoVeiculo === "camionete"
            ? "O banco ainda não aceita o tipo 'camionete'. Rode a migration supabase/migrations/20260512120000_modelos_tipo_veiculo_camionete.sql no SQL Editor do Supabase e tente de novo."
            : "Valor inválido para tipo de veículo no banco. Rode a migration supabase/migrations/20260512120000_modelos_tipo_veiculo_camionete.sql no Supabase e tente de novo.",
      };
    }
    if (error.message.includes("tipo_veiculo")) {
      return {
        ok: false,
        message:
          "Coluna tipo_veiculo ausente no banco. Execute as migrations em supabase/migrations (em ordem) no Supabase e tente de novo.",
      };
    }
    return {
      ok: false,
      message: `Não foi possível salvar: ${error.message}. Tente de novo.`,
    };
  }

  revalidatePath("/admin/marcas-e-modelos");
  revalidatePath("/admin/marcas");
  revalidatePath("/admin/modelos");
  revalidatePath("/admin/produtos/novo");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/produtos");
  redirect("/admin/marcas-e-modelos?cadastrado=modelo");
}

export type UpdateModeloResult = { ok: true } | { ok: false; message: string };

export async function updateModelo(formData: FormData): Promise<UpdateModeloResult> {
  await requireAdmin();
  const modeloId = String(formData.get("modelo_id") ?? "").trim();
  const marcaId = String(formData.get("marca_id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const tipoVeiculo = parseTipoVeiculoModelo(String(formData.get("tipo_veiculo") ?? ""));

  if (!modeloId) {
    return { ok: false, message: "Modelo inválido." };
  }
  if (!marcaId) {
    return { ok: false, message: "Escolha a marca do veículo." };
  }
  if (!nome) {
    return { ok: false, message: "Informe o nome do modelo." };
  }
  if (!tipoVeiculo) {
    return { ok: false, message: "Escolha se o modelo é de carro, caminhão ou camionete." };
  }

  const supabase = await createClient();
  const slug = await allocateModeloSlug(supabase, marcaId, nome, modeloId);

  const { error } = await supabase
    .from("modelos")
    .update({
      marca_id: marcaId,
      nome,
      slug,
      tipo_veiculo: tipoVeiculo,
    })
    .eq("id", modeloId);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message:
          "Já existe um modelo com esse identificador (slug) para esta marca. Ajuste o nome ou escolha outra marca.",
      };
    }
    if (
      error.code === "23514" ||
      error.message.includes("modelos_tipo_veiculo_check")
    ) {
      return {
        ok: false,
        message:
          tipoVeiculo === "camionete"
            ? "O banco ainda não aceita o tipo 'camionete'. Rode a migration supabase/migrations/20260512120000_modelos_tipo_veiculo_camionete.sql no SQL Editor do Supabase e tente de novo."
            : "Valor inválido para tipo de veículo no banco. Rode a migration supabase/migrations/20260512120000_modelos_tipo_veiculo_camionete.sql no Supabase e tente de novo.",
      };
    }
    if (error.message.includes("tipo_veiculo")) {
      return {
        ok: false,
        message:
          "Coluna tipo_veiculo ausente no banco. Execute as migrations em supabase/migrations (em ordem) no Supabase e tente de novo.",
      };
    }
    return { ok: false, message: `Não foi possível salvar: ${error.message}. Tente de novo.` };
  }

  revalidatePath("/admin/marcas-e-modelos");
  revalidatePath("/admin/marcas");
  revalidatePath("/admin/modelos");
  revalidatePath("/admin/produtos/novo");
  revalidatePath("/admin/produtos");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/produtos");
  return { ok: true };
}

export type ModeloAnoState =
  | null
  | { ok: false; message: string }
  | { ok: true; message: string };

export type ModeloAnoRef = { id: string; ano: number };

export type GetModeloAnosRefsResult =
  | { ok: true; anos: ModeloAnoRef[] }
  | { ok: false; message: string };

/** Anos de referência de um modelo (admin: expandir linha na listagem). */
export async function getModeloAnosRefs(modeloId: string): Promise<GetModeloAnosRefsResult> {
  await requireAdmin();
  const id = modeloId.trim();
  if (!id) {
    return { ok: false, message: "Modelo inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modelo_anos")
    .select("id, ano")
    .eq("modelo_id", id)
    .order("ano", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.message.includes("modelo_anos")) {
      return {
        ok: false,
        message:
          "Tabela modelo_anos não encontrada. Execute a migration em supabase/migrations no painel SQL do Supabase.",
      };
    }
    return { ok: false, message: error.message };
  }

  const anos = (data ?? []).map((row) => ({
    id: String(row.id),
    ano: Number(row.ano),
  }));

  return { ok: true, anos };
}

const ANO_MIN = 1900;
const ANO_MAX = 2100;
const INTERVALO_MAX = 100;

export async function addModeloAno(
  _prev: ModeloAnoState,
  formData: FormData
): Promise<ModeloAnoState> {
  await requireAdmin();
  const modeloId = String(formData.get("modelo_id") ?? "").trim();
  // Aceita `ano_inicio` (novo) e `ano` (legado) como o ano inicial.
  const anoIniRaw = String(formData.get("ano_inicio") ?? formData.get("ano") ?? "").trim();
  const anoFimRaw = String(formData.get("ano_fim") ?? "").trim();

  if (!modeloId) {
    return { ok: false, message: "Modelo inválido." };
  }
  if (!anoIniRaw) {
    return { ok: false, message: "Informe um ano (ou um intervalo de anos)." };
  }

  const anoIni = Number.parseInt(anoIniRaw, 10);
  if (Number.isNaN(anoIni) || anoIni < ANO_MIN || anoIni > ANO_MAX) {
    return { ok: false, message: `Informe um ano entre ${ANO_MIN} e ${ANO_MAX}.` };
  }

  // `ano_fim` vazio = mesmo comportamento de um ano único.
  const anoFim = anoFimRaw ? Number.parseInt(anoFimRaw, 10) : anoIni;
  if (Number.isNaN(anoFim) || anoFim < ANO_MIN || anoFim > ANO_MAX) {
    return { ok: false, message: `Ano final inválido (entre ${ANO_MIN} e ${ANO_MAX}).` };
  }
  if (anoFim < anoIni) {
    return { ok: false, message: "O ano final precisa ser maior ou igual ao inicial." };
  }
  if (anoFim - anoIni > INTERVALO_MAX) {
    return { ok: false, message: `Intervalo muito grande (máx. ${INTERVALO_MAX} anos).` };
  }

  const supabase = await createClient();

  // Ano único: mantém o caminho original com a mensagem clara de duplicado.
  if (anoFim === anoIni) {
    const { error } = await supabase.from("modelo_anos").insert({
      modelo_id: modeloId,
      ano: anoIni,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, message: "Este ano já está cadastrado para este modelo." };
      }
      if (error.code === "42P01" || error.message.includes("modelo_anos")) {
        return {
          ok: false,
          message:
            "Tabela modelo_anos não encontrada. Execute a migration em supabase/migrations no painel SQL do Supabase.",
        };
      }
      return { ok: false, message: `Não foi possível salvar: ${error.message}` };
    }

    revalidatePath("/admin/marcas-e-modelos");
    revalidatePath("/admin/modelos");
    revalidatePath("/");
    revalidatePath("/produtos");
    return { ok: true, message: `Ano ${anoIni} adicionado.` };
  }

  // Intervalo: descobre o que já existe para inserir só o que falta e informar o resultado.
  const totalAnos = anoFim - anoIni + 1;
  const todosAnos: number[] = [];
  for (let y = anoIni; y <= anoFim; y++) todosAnos.push(y);

  const { data: existentes, error: selErr } = await supabase
    .from("modelo_anos")
    .select("ano")
    .eq("modelo_id", modeloId)
    .gte("ano", anoIni)
    .lte("ano", anoFim);

  if (selErr) {
    if (selErr.code === "42P01" || selErr.message.includes("modelo_anos")) {
      return {
        ok: false,
        message:
          "Tabela modelo_anos não encontrada. Execute a migration em supabase/migrations no painel SQL do Supabase.",
      };
    }
    return { ok: false, message: `Não foi possível verificar anos existentes: ${selErr.message}` };
  }

  const jaExistem = new Set<number>((existentes ?? []).map((r) => Number(r.ano)));
  const novos = todosAnos.filter((y) => !jaExistem.has(y));

  if (novos.length === 0) {
    return {
      ok: false,
      message: `Todos os ${totalAnos} anos do intervalo (${anoIni}–${anoFim}) já estão cadastrados.`,
    };
  }

  const { error: insErr } = await supabase
    .from("modelo_anos")
    .insert(novos.map((ano) => ({ modelo_id: modeloId, ano })));

  if (insErr) {
    if (insErr.code === "42P01" || insErr.message.includes("modelo_anos")) {
      return {
        ok: false,
        message:
          "Tabela modelo_anos não encontrada. Execute a migration em supabase/migrations no painel SQL do Supabase.",
      };
    }
    return { ok: false, message: `Não foi possível salvar: ${insErr.message}` };
  }

  revalidatePath("/admin/marcas-e-modelos");
  revalidatePath("/admin/modelos");
  revalidatePath("/");
  revalidatePath("/produtos");

  const pulados = totalAnos - novos.length;
  const baseMsg = `${novos.length} ano(s) adicionado(s) (${anoIni}–${anoFim})`;
  return {
    ok: true,
    message: pulados > 0 ? `${baseMsg}; ${pulados} já existia(m).` : `${baseMsg}.`,
  };
}

export async function removeModeloAno(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("modelo_anos").delete().eq("id", id);
  revalidatePath("/admin/marcas-e-modelos");
  revalidatePath("/admin/modelos");
  revalidatePath("/");
  revalidatePath("/produtos");
}

export type DeleteModeloResult = { ok: true } | { ok: false; message: string };

export async function deleteModelo(modeloId: string): Promise<DeleteModeloResult> {
  await requireAdmin();
  const id = modeloId.trim();
  if (!id) {
    return { ok: false, message: "Modelo inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("modelos").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        message:
          "Não é possível excluir: ainda há dados vinculados a este modelo que impedem a remoção. Verifique o banco ou entre em contato com o suporte.",
      };
    }
    return { ok: false, message: `Não foi possível excluir: ${error.message}.` };
  }

  revalidatePath("/admin/marcas-e-modelos");
  revalidatePath("/admin/marcas");
  revalidatePath("/admin/modelos");
  revalidatePath("/admin/produtos");
  revalidatePath("/admin/produtos/novo");
  revalidatePath("/produtos");
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export type DeleteModelosEmLoteResult = {
  removidos: number;
  falhas: { id: string; message: string }[];
};

/** Exclui vários modelos em sequência; falhas por FK ou outro motivo são retornadas sem interromper os demais. */
export async function deleteModelosEmLote(ids: string[]): Promise<DeleteModelosEmLoteResult> {
  await requireAdmin();
  const unique = [...new Set(ids.map((x) => x.trim()).filter(Boolean))];
  const falhas: { id: string; message: string }[] = [];
  let removidos = 0;

  if (unique.length === 0) {
    return { removidos: 0, falhas: [] };
  }

  const supabase = await createClient();
  for (const id of unique) {
    const { error } = await supabase.from("modelos").delete().eq("id", id);
    if (error) {
      const message =
        error.code === "23503"
          ? "Ainda há dados vinculados a este modelo que impedem a remoção."
          : `Não foi possível excluir: ${error.message}`;
      falhas.push({ id, message });
    } else {
      removidos += 1;
    }
  }

  if (removidos > 0) {
    revalidatePath("/admin/marcas-e-modelos");
    revalidatePath("/admin/marcas");
    revalidatePath("/admin/modelos");
    revalidatePath("/admin/produtos");
    revalidatePath("/admin/produtos/novo");
    revalidatePath("/produtos");
    revalidatePath("/");
    revalidatePath("/admin");
  }

  return { removidos, falhas };
}
