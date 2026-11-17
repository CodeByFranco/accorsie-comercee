"use client";

import { useState } from "react";

const LIMITE_INICIAL = 10;

export function ProductCompatibilidadeList({ items }: { items: string[] }) {
  const [expandido, setExpandido] = useState(false);
  const visiveis = expandido ? items : items.slice(0, LIMITE_INICIAL);
  const restantes = items.length - LIMITE_INICIAL;

  return (
    <div className="space-y-2">
      <ul className="flex flex-col items-start gap-2">
        {visiveis.map((item) => (
          <li key={item} className="max-w-full">
            <span className="inline-block max-w-full rounded-full border border-store-line bg-white px-3 py-1.5 text-left text-sm leading-snug text-store-navy">
              {item}
            </span>
          </li>
        ))}
      </ul>
      {restantes > 0 ? (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="text-sm font-semibold text-store-navy underline-offset-4 hover:underline"
        >
          {expandido ? "Ver menos" : `Ver mais (${restantes})`}
        </button>
      ) : null}
    </div>
  );
}
