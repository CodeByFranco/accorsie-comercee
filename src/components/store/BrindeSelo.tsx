import type { ReactNode } from "react";

const MENSAGEM_PADRAO = (
  <>
    Comprou na Accorsi? Seu pedido acompanha um <span className="font-semibold">brinde especial</span>!
  </>
);

export function GiftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

/** Selo "Mimo Accorsi" da vitrine avisando que todo pedido acompanha brinde. */
export function BrindeSelo({
  className = "",
  children = MENSAGEM_PADRAO,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex w-full items-center gap-3 rounded-lg border border-store-accent/40 bg-[#FFF5EE] px-3 py-2 text-store-navy ${className}`}
    >
      <GiftIcon className="h-6 w-6 shrink-0 text-store-accent" />
      <div className="min-w-0 leading-tight">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-store-accent">
          Mimo Accorsi
          <span className="rounded-full bg-store-accent/15 px-1.5 py-px text-[9px] font-semibold normal-case tracking-normal text-store-accent">
            Especial
          </span>
        </p>
        <p className="mt-0.5 text-[13px] text-store-navy">{children}</p>
      </div>
    </div>
  );
}
