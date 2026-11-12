import type { ReactNode } from "react";

const MENSAGEM_PADRAO = (
  <>
    Comprou na Accorsi? Seu pedido acompanha um <span className="font-semibold">brinde especial</span>!
  </>
);

/** Aviso de brinde da vitrine: todo pedido acompanha um brinde. */
export function BrindeSelo({
  className = "",
  children = MENSAGEM_PADRAO,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex w-full items-center gap-3 overflow-hidden rounded-xl bg-store-navy px-3 py-2.5 text-white shadow-md ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ícone local estático */}
      <img src="/icons/presente.png" alt="" className="h-12 w-12 shrink-0 drop-shadow-md" />
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-store-accent">
          Brinde Accorsi
        </p>
        <p className="mt-1 text-sm leading-snug text-white">{children}</p>
      </div>
    </div>
  );
}
