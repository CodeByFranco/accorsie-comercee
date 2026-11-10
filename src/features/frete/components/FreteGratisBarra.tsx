import { faltaParaFreteGratis, FRETE_GRATIS_MINIMO } from "@/features/frete/freteGratis";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function TruckIcon({ className }: { className?: string }) {
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
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

/** Progresso até o frete grátis; `valorProdutos` já com descontos de kit e cupom. */
export function FreteGratisBarra({
  valorProdutos,
  className = "",
}: {
  valorProdutos: number;
  className?: string;
}) {
  const falta = faltaParaFreteGratis(valorProdutos);
  const atingiu = falta <= 0;
  const pct = Math.min(100, Math.max(0, (valorProdutos / FRETE_GRATIS_MINIMO) * 100));

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-store-navy ${
        atingiu ? "border-emerald-300 bg-emerald-50" : "border-store-accent/40 bg-[#FFF5EE]"
      } ${className}`}
      role="status"
    >
      <p className="flex items-center gap-2 text-[13px] leading-snug">
        <TruckIcon
          className={`h-5 w-5 shrink-0 ${atingiu ? "text-emerald-700" : "text-store-accent"}`}
        />
        {atingiu ? (
          <span>
            <span className="font-semibold text-emerald-800">Você ganhou frete grátis!</span> Vale para a opção
            de entrega mais econômica.
          </span>
        ) : (
          <span>
            Faltam <span className="font-semibold">{money.format(falta)}</span> para ganhar{" "}
            <span className="font-semibold">frete grátis</span>
          </span>
        )}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"
        aria-hidden
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            atingiu ? "bg-emerald-500" : "bg-store-accent"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
