"use client";

import { useState } from "react";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function IconEye({ open }: { open: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      {!open && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );
}

export function RevealValorEstoque({ valor }: { valor: number }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Valor em estoque</p>
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
          aria-label={revealed ? "Ocultar valor em estoque" : "Mostrar valor em estoque"}
          aria-pressed={revealed}
        >
          <IconEye open={revealed} />
        </button>
      </div>
      <p
        className={`mt-1 text-2xl font-bold tracking-tight ${revealed ? "text-gray-900" : "select-none text-gray-400"}`}
      >
        {revealed ? money.format(valor) : "••••••"}
      </p>
    </article>
  );
}
