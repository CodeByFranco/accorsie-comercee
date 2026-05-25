"use client";

import { useState } from "react";

type ProductSomenteRetiradaFieldProps = {
  defaultChecked?: boolean;
};

export function ProductSomenteRetiradaField({ defaultChecked = false }: ProductSomenteRetiradaFieldProps) {
  const [on, setOn] = useState(defaultChecked);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Entrega</p>
      {on ? <input type="hidden" name="somente_retirada_loja" value="on" /> : null}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn((v) => !v)}
        className={[
          "mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold shadow-sm transition",
          on
            ? "border-slate-500/80 bg-slate-100 text-slate-950 hover:bg-slate-200/90"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
        ].join(" ")}
      >
        {on ? "Somente retirada na loja (sem envio)" : "Marcar: somente retirada na loja"}
      </button>
      <p className="mt-2 text-xs text-gray-500">
        Com esta opção ativa, o cliente não poderá escolher entrega no endereço para este produto. Se o
        carrinho tiver qualquer item assim, o checkout inteiro fica só com retirada na loja.
      </p>
    </div>
  );
}
