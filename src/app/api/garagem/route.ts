import { NextResponse } from "next/server";

import { resolveCatalogModeloId } from "@/features/compatibilidade/services/resolveCatalogModelo";
import { createClient } from "@/services/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SaveGaragePayload = {
  placa?: string;
  marca?: string | null;
  modelo?: string | null;
  ano?: number | null;
  modeloId?: string | null;
};

function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function isValidPlate(plate: string): boolean {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate) || /^[A-Z]{3}[0-9]{4}$/.test(plate);
}

function normalizeText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeYear(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 1900 && raw <= 2100) return raw;
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Faça login para salvar veículos na garagem." }, { status: 401 });
  }

  let body: SaveGaragePayload;
  try {
    body = (await request.json()) as SaveGaragePayload;
  } catch {
    return NextResponse.json({ message: "Payload inválido." }, { status: 400 });
  }

  const placa = normalizePlate(String(body.placa ?? ""));
  if (!isValidPlate(placa)) {
    return NextResponse.json({ message: "Placa inválida. Use ABC1234 ou ABC1D23." }, { status: 400 });
  }

  const marca = normalizeText(body.marca);
  const modelo = normalizeText(body.modelo);
  const ano = normalizeYear(body.ano);
  // Sem modelo_id o "Filtrar" da garagem só manda o ano — resolve no catálogo quando o client não enviou.
  let modeloId = normalizeText(body.modeloId);
  if (modeloId && !UUID_RE.test(modeloId)) modeloId = null;
  if (!modeloId) {
    modeloId = await resolveCatalogModeloId({ marca, modelo, ano }).catch(() => null);
  }

  const { error } = await supabase.from("garagem_veiculos").upsert(
    {
      user_id: user.id,
      placa,
      marca,
      modelo,
      ano,
      modelo_id: modeloId,
    },
    { onConflict: "user_id,placa" }
  );

  if (error) {
    return NextResponse.json({ message: `Não foi possível salvar na garagem: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Faça login para remover veículos da garagem." }, { status: 401 });
  }

  const url = new URL(request.url);
  const idParam = url.searchParams.get("id");
  const id = Number.parseInt(idParam ?? "", 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ message: "ID inválido para exclusão." }, { status: 400 });
  }

  const { error } = await supabase.from("garagem_veiculos").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ message: `Não foi possível excluir: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
