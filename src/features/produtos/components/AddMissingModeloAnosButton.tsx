"use client";

import { useState, useTransition } from "react";
import { ensureModeloAnosCadastrados } from "@/features/compatibilidade/services/modeloActions";
import type { MissingModeloAno } from "@/features/compatibilidade/utils/assertCompatModeloAnos";

export function AddMissingModeloAnosButton({
  missing,
  onAdded,
  pendingLabel,
}: {
  missing: MissingModeloAno[];
  onAdded: () => void;
  /** Texto enquanto processa (ex.: após clicar). */
  pendingLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  const anosUnicos = [...new Set(missing.map((m) => m.ano))].sort((a, b) => a - b);
  const label =
    anosUnicos.length === 1
      ? "Adicionar esse ano aos modelos cadastrados"
      : "Adicionar esses anos aos modelos cadastrados";

  return (
    <div className="mt-3 flex flex-col gap-2">
      <button
        type="button"
        disabled={pending || missing.length === 0}
        onClick={() => {
          setLocalError(null);
          startTransition(async () => {
            const result = await ensureModeloAnosCadastrados(missing);
            if (!result.ok) {
              setLocalError(result.message);
              return;
            }
            onAdded();
          });
        }}
        className="inline-flex w-fit items-center justify-center rounded-lg bg-admin-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1857d1] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (pendingLabel ?? "Adicionando…") : label}
      </button>
      <p className="text-xs text-red-800/80">
        Cadastra o ano no modelo, salva o produto e tenta publicar — você permanece nesta tela.
      </p>
      {localError ? <p className="text-sm font-medium text-red-900">{localError}</p> : null}
    </div>
  );
}
