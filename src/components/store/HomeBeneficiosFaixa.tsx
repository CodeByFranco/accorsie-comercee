import type { ReactNode } from "react";

import { storeShellContent, storeShellInset } from "@/config/storeShell";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const iconClass = "h-5 w-5 shrink-0 text-store-accent";

const BENEFICIOS: Array<{ icone: ReactNode; titulo: string; texto: string }> = [
  {
    icone: (
      // eslint-disable-next-line @next/next/no-img-element -- ícone local estático
      <img src="/icons/presente.png" alt="" className="h-8 w-8 shrink-0 opacity-90" />
    ),
    titulo: "Brinde Accorsi",
    texto: "Brinde especial em todo pedido",
  },
  {
    icone: (
      <svg {...iconProps} className={iconClass}>
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
        <path d="m15 9-6 6" />
        <path d="M9 9h.01" />
        <path d="M15 15h.01" />
      </svg>
    ),
    titulo: "Desconto no PIX",
    texto: "Economize nas suas compras",
  },
  {
    icone: (
      <svg {...iconProps} className={iconClass}>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    titulo: "Compra segura",
    texto: "Proteção Mercado Pago",
  },
];

/** Três cartões de vantagens da loja, logo abaixo do banner da home. */
export function HomeBeneficiosFaixa() {
  return (
    <section
      aria-label="Vantagens de comprar na Accorsi"
      className={`bg-store-cream py-4 sm:py-5 ${storeShellInset}`}
    >
      <ul
        className={`${storeShellContent} flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-2.5`}
      >
        {BENEFICIOS.map((b) => (
          <li
            key={b.titulo}
            className="flex w-fit max-w-full items-center gap-2 rounded-md border border-store-navy/12 bg-[#e8edf5] px-3.5 py-2.5 shadow-[0_2px_10px_rgba(52,69,107,0.12)]"
          >
            {b.icone}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-store-navy">{b.titulo}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-store-navy/65 sm:text-xs">{b.texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}