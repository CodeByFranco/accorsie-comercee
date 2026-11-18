"use client";

import { useState } from "react";

type ProductDestaqueFieldProps = {
  /** Edição: estado inicial vindo do servidor */
  defaultChecked?: boolean;
};

export function ProductDestaqueField({ defaultChecked = false }: ProductDestaqueFieldProps) {
  const [on, setOn] = useState(defaultChecked);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Destaque na loja</p>
      {on ? <input type="hidden" name="em_destaque" value="on" /> : null}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn((v) => !v)}
        className={[
          "mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold shadow-sm transition",
          on
            ? "border-amber-400/80 bg-amber-50 text-amber-950 hover:bg-amber-100/90"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
        ].join(" ")}
      >
        <StarIcon filled={on} />
        {on ? "Em destaque na home" : "Marcar como destaque na home"}
      </button>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        Aparece em Destaques na página inicial.
      </p>
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg className="h-5 w-5 shrink-0 text-amber-500" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l7.1-1.01L12 2z"
        />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l7.1-1.01L12 2z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  );
}
