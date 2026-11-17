"use client";

import { useState, useTransition } from "react";

import { setSiteLojaPublica } from "@/features/site-layout/services/setSiteLojaPublica";
import { MAINTENANCE_MODE } from "@/lib/siteMaintenance";

type SiteMaintenanceToggleProps = {
  initialLojaPublica: boolean;
};

export function SiteMaintenanceToggle({ initialLojaPublica }: SiteMaintenanceToggleProps) {
  const envForced = MAINTENANCE_MODE;
  const [lojaPublica, setLojaPublica] = useState(initialLojaPublica);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const emManutencao = envForced || !lojaPublica;

  const onToggle = () => {
    if (envForced || pending) return;
    const next = !lojaPublica;
    setMessage(null);
    startTransition(async () => {
      const result = await setSiteLojaPublica(next);
      if (result.ok) {
        setLojaPublica(result.lojaPublica);
        setMessage({ kind: "ok", text: result.message });
      } else {
        setMessage({ kind: "err", text: result.message });
      }
    });
  };

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Loja na vitrine</h2>
          <p className="mt-1 text-sm text-gray-600">
            Visitantes veem o catálogo quando a loja está ativa. Em manutenção, são enviados para a página «em
            construção» (admin logado continua acessando).
          </p>
          {envForced ? (
            <p className="mt-2 text-xs font-medium text-amber-800">
              A variável de ambiente <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_MAINTENANCE_MODE</code>{" "}
              está forçando manutenção — ajuste na Vercel ou no <code className="rounded bg-amber-100 px-1">.env</code>{" "}
              para usar só este controle.
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">Alteração salva no Supabase; pode levar até ~20 segundos para valer em todas as requisições.</p>
          )}
          {message ? (
            <p
              className={`mt-2 text-sm ${message.kind === "ok" ? "text-emerald-800" : "text-red-700"}`}
              role="status"
            >
              {message.text}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <span
            className={`inline-flex w-fit self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:self-end ${
              emManutencao
                ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
                : "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
            }`}
          >
            {emManutencao ? "Em manutenção" : "Loja ativa"}
          </span>
          <button
            type="button"
            disabled={envForced || pending}
            onClick={onToggle}
            className="rounded-lg bg-admin-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1857d1] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "Salvando…"
              : lojaPublica
                ? "Colocar em manutenção"
                : "Ativar loja para visitantes"}
          </button>
        </div>
      </div>
    </section>
  );
}