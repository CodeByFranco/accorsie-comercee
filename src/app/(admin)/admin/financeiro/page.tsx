import { FinanceiroParcelamentoForm } from "@/features/financeiro/components/FinanceiroParcelamentoForm";
import { getParcelamentoFaixasAdmin } from "@/features/financeiro/services/getParcelamentoFaixas";

export const metadata = {
  title: "Financeiro | Admin",
};

export default async function AdminFinanceiroPage() {
  const { faixas, error } = await getParcelamentoFaixasAdmin();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-gray-500">Financeiro</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">Parcelamento</h2>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Parcelamento sem juros no cartão.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm" role="alert">
          <p className="font-semibold">Banco de dados</p>
          <p className="mt-1">
            Não foi possível ler as faixas: {error}. Aplique a migração{" "}
            <code className="rounded bg-white/80 px-1">supabase/migrations/20261117120000_parcelamento_faixas.sql</code>{" "}
            no Supabase. Enquanto isso a loja usa o padrão (a partir de R$ 100 em 2x e a partir de R$ 500 em 6x).
          </p>
        </div>
      ) : null}

      <FinanceiroParcelamentoForm initial={faixas} />
    </div>
  );
}
