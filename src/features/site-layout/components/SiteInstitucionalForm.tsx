"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  saveSiteInstitucional,
  type SaveSiteInstitucionalState,
} from "@/features/site-layout/services/saveSiteInstitucional";
import type { SiteInstitucional } from "@/features/site-layout/utils/institucional";

const fieldClass =
  "mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20";

export function SiteInstitucionalForm({ initial }: { initial: SiteInstitucional }) {
  const [state, formAction, pending] = useActionState(
    saveSiteInstitucional,
    null as SaveSiteInstitucionalState | null,
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">Textos institucionais</h2>
      <p className="mt-1 text-sm text-gray-600">
        Manifesto da página «Quem somos» e horário de funcionamento do rodapé. Deixe um campo vazio para voltar ao
        texto padrão.
      </p>

      {state ? (
        <p
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      <form action={formAction} className="mt-6 space-y-6">
        <input type="hidden" name="manifesto_texto" value={initial.manifesto_texto} />
        <p className="text-sm text-gray-600">
          O manifesto agora é editado em{" "}
          <Link href="/admin/layout/sobre" className="font-medium text-admin-accent hover:underline">
            Página Sobre
          </Link>
          .
        </p>

        <label className="block">
          <span className="text-sm font-medium text-gray-800">Horário de funcionamento (rodapé)</span>
          <span className="mt-0.5 block text-xs text-gray-500">Um horário por linha.</span>
          <textarea name="horarios_texto" rows={3} defaultValue={initial.horarios_texto} className={fieldClass} />
        </label>

        <div className="border-t border-gray-100 pt-6">
          <button
            type="submit"
            className="rounded-lg bg-admin-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1857d1] disabled:opacity-60"
            disabled={pending}
          >
            {pending ? "Salvando…" : "Salvar textos"}
          </button>
        </div>
      </form>
    </div>
  );
}
