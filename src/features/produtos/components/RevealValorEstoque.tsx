"use client";

import { useState } from "react";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function RevealValorEstoque({ valor }: { valor: number }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Valor em estoque</p>
      {revealed ? (
        <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{money.format(valor)}</p>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-2 flex w-full flex-col items-start gap-0.5 text-left"
          aria-label="Mostrar valor em estoque"
        >
          <span className="text-2xl font-bold tracking-tight text-gray-400 select-none" aria-hidden>
            ••••••
          </span>
          <span className="text-xs font-medium text-admin-accent underline-offset-2 hover:underline">
            Clique para ver
          </span>
        </button>
      )}
    </article>
  );
}
