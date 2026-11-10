type CashbackTransacao = {
  id: string;
  tipo: string;
  valor: string | number;
  descricao: string | null;
  created_at: string;
};

type CashbackResumoProps = {
  saldo: number;
  transacoes: CashbackTransacao[];
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

/** Saldo de cashback (2,5% das compras pagas) e últimos lançamentos. */
export function CashbackResumo({ saldo, transacoes }: CashbackResumoProps) {
  return (
    <section
      className="mb-6 rounded-sm border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6"
      aria-labelledby="cashback-resumo-titulo"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="cashback-resumo-titulo" className="text-lg font-bold text-black">
            Meu cashback
          </h2>
          <p className="mt-1 text-sm text-store-navy">
            Ganhe 2,5% do valor de cada compra paga para abater nas próximas compras.
          </p>
        </div>
        <p className="text-2xl font-bold tabular-nums text-emerald-800">{money.format(saldo)}</p>
      </div>
      {transacoes.length > 0 ? (
        <ul className="mt-4 divide-y divide-emerald-200 text-sm">
          {transacoes.map((t) => {
            const v = Number(t.valor);
            return (
              <li key={t.id} className="flex justify-between gap-4 py-2">
                <span className="text-store-navy">
                  {date.format(new Date(t.created_at))} · {t.descricao ?? t.tipo}
                </span>
                <span
                  className={`font-semibold tabular-nums ${v >= 0 ? "text-emerald-800" : "text-red-700"}`}
                >
                  {v >= 0 ? "+" : "−"} {money.format(Math.abs(v))}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
