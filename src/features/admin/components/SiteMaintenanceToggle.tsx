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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ativa = !envForced && lojaPublica;

  const onToggle = () => {
    if (envForced || pending) return;
    const next = !lojaPublica;
    setError(null);
    startTransition(async () => {
      const result = await setSiteLojaPublica(next);
      if (result.ok) setLojaPublica(result.lojaPublica);
      else setError(result.message);
    });
  };

  const title = envForced
    ? "NEXT_PUBLIC_MAINTENANCE_MODE está forçando manutenção (ajuste na Vercel ou no .env)."
    : ativa
      ? "Loja visível para visitantes. Clique para colocar em manutenção."
      : "Em manutenção: visitantes veem «em construção». Clique para ativar.";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && (
        <span className="text-xs text-red-700" role="status">
          {error}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={ativa}
        aria-label="Loja na vitrine"
        title={title}
        disabled={envForced || pending}
        onClick={onToggle}
        className={`inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-semibold shadow-sm ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
          ativa
            ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
            : "bg-amber-50 text-amber-900 ring-amber-200"
        }`}
      >
        <span
          className={`relative h-5 w-9 rounded-full transition-colors ${ativa ? "bg-emerald-500" : "bg-gray-300"}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              ativa ? "left-[18px]" : "left-0.5"
            }`}
          />
        </span>
        {pending ? "Salvando…" : ativa ? "Loja ativa" : "Em manutenção"}
      </button>
    </div>
  );
}
