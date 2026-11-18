import { CupomForm } from "@/features/cupons/components/CupomForm";
import { CupomRow, type CupomListRow } from "@/features/cupons/components/CupomRow";
import { createClient } from "@/services/supabase/server";

export const metadata = {
  title: "Cupons | Admin",
};

export default async function AdminCuponsPage({
  searchParams,
}: {
  searchParams: Promise<{ cadastrado?: string }>;
}) {
  const { cadastrado } = await searchParams;
  const showOk = cadastrado === "1";

  let cupons: CupomListRow[] = [];
  let listError: string | null = null;
  let configError: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cupons")
      .select("id, codigo, tipo, valor, ativo, valido_ate, max_usos, usos_count")
      .order("created_at", { ascending: false });

    if (error) {
      listError = error.message;
    } else if (data) {
      cupons = data as CupomListRow[];
    }
  } catch (e) {
    configError = e instanceof Error ? e.message : "Erro ao carregar configuração.";
  }

  return (
    <div className="space-y-8">
      {configError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          <p className="font-semibold">Configuração</p>
          <p className="mt-1">{configError}</p>
        </div>
      )}

      {!configError && showOk && (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm"
          role="status"
        >
          <p className="font-semibold text-emerald-900">Cupom cadastrado</p>
          <p className="mt-1 text-emerald-800/95">Ele já pode ser usado no checkout da loja.</p>
        </div>
      )}

      {!configError && listError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 shadow-sm" role="alert">
          <p className="font-semibold">Banco de dados</p>
          <p className="mt-1">
            Não foi possível listar cupons: {listError}. Aplique a migração{" "}
            <code className="rounded bg-gray-100 px-1">supabase/migrations/20260504120000_cupons_pedidos.sql</code> no
            Supabase.
          </p>
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cupons de desconto</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Desconto em % ou valor fixo, informado pelo cliente no carrinho.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-start">
          {!configError && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <h3 className="text-base font-semibold text-gray-900">Novo cupom</h3>
              <p className="mt-1 text-sm text-gray-500">O desconto incide sobre produtos + frete.</p>
              <div className="mt-6">
                <CupomForm />
              </div>
            </div>
          )}

          {!configError && (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-base font-semibold text-gray-900">Cupons cadastrados</h3>
                <p className="mt-0.5 text-sm text-gray-500">Edite, desative ou exclua. Usos são contados ao criar o pedido.</p>
              </div>

              {listError ? (
                <p className="px-6 py-6 text-sm text-red-700">Não foi possível listar cupons.</p>
              ) : cupons.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-gray-500">Nenhum cupom ainda. Cadastre o primeiro ao lado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3 font-semibold normal-case tracking-normal">Código</th>
                        <th className="px-4 py-3 font-semibold normal-case tracking-normal">Tipo</th>
                        <th className="px-4 py-3 font-semibold normal-case tracking-normal">Valor</th>
                        <th className="px-4 py-3 font-semibold normal-case tracking-normal">Status</th>
                        <th className="px-4 py-3 font-semibold normal-case tracking-normal">Usos</th>
                        <th className="w-[1%] px-4 py-3 text-right font-semibold normal-case tracking-normal">
                          <span className="sr-only">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cupons.map((c) => (
                        <CupomRow key={c.id} row={c} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
