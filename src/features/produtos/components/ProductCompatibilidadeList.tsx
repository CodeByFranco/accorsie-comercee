"use client";

import { useState } from "react";

const LIMITE_INICIAL = 10;

export function ProductCompatibilidadeList({ items }: { items: string[] }) {
  const [expandido, setExpandido] = useState(false);
  const visiveis = expandido ? items : items.slice(0, LIMITE_INICIAL);
  const restantes = items.length - LIMITE_INICIAL;

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-1.5">
        {visiveis.map((item) => (
          <li
            key={item}
            className="rounded-full border border-store-line/70 bg-store-subtle/70 px-3 py-1 text-xs leading-snug text-store-navy"
          >
            {item}
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
