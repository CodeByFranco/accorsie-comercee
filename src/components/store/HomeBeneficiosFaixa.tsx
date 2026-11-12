import type { ReactNode } from "react";

import { storeShellContent, storeShellInset } from "@/config/storeShell";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const iconClass = "h-6 w-6 shrink-0 text-store-accent";

const BENEFICIOS: Array<{ icone: ReactNode; titulo: string; texto: string; brinde?: boolean }> = [
  {
    icone: (
      // eslint-disable-next-line @next/next/no-img-element -- ícone local estático
      <img src="/icons/presente.png" alt="" className="h-10 w-10 shrink-0 drop-shadow-sm" />
    ),
    titulo: "Brinde Accorsi",
    texto: "Brinde especial em todo pedido",
    brinde: true,
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
    texto: "Preço especial pagando no PIX",
  },
  {
    icone: (
      <svg {...iconProps} className={iconClass}>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    titulo: "Pagamento seguro",
    texto: "Compra protegida pelo Mercado Pago",
  },
];

/** Faixa fina de vantagens da loja, logo abaixo do banner da home. */
export function HomeBeneficiosFaixa() {
  return (
    <section aria-label="Vantagens de comprar na Accorsi" className={`bg-store-cream pt-5 sm:pt-6 ${storeShellInset}`}>
      <ul
        className={`${storeShellContent} grid grid-cols-1 divide-y divide-store-accent/25 rounded-lg border border-store-accent/40 bg-[#FFF5EE] sm:grid-cols-3 sm:divide-x sm:divide-y-0`}
      >
        {BENEFICIOS.map((b) => (
          <li key={b.titulo} className="flex items-center gap-3 px-4 py-2.5">
            {b.icone}
            <div className="min-w-0 leading-tight">
              {b.brinde ? (
                <p className="inline-flex rounded-full bg-store-navy px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-store-accent">
                  {b.titulo}
                </p>
              ) : (
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-store-accent">{b.titulo}</p>
              )}
              <p className={`text-store-navy ${b.brinde ? "mt-1 text-sm font-semibold" : "mt-0.5 text-[13px]"}`}>
                {b.texto}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
