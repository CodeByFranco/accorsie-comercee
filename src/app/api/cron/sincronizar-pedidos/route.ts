import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { sincronizarPedidosAutomatico } from "@/features/pedidos-admin/services/sincronizarPedidosAutomatico";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function autorizado(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Chamado pelo Vercel Cron (envia `Authorization: Bearer $CRON_SECRET`). */
export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const resumo = await sincronizarPedidosAutomatico();
  return NextResponse.json({ ok: true, ...resumo });
}
