import Link from "next/link";
import { createClient } from "@/services/supabase/server";
import { CategoriaForm } from "@/features/categorias/components/CategoriaForm";
import { CategoriaRow } from "@/features/categorias/components/CategoriaRow";

export const metadata = {
  title: "Categorias | Admin",
};

type CategoriaListRow = {
  id: string;
  nome: string;
  icone: string | null;
};

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ cadastrado?: string }>;
}) {
  const { cadastrado } = await searchParams;
  const showOk = cadastrado === "1";

  let categorias: CategoriaListRow[] = [];
  let configError: string | null = null;
  let listError: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("categorias").select("id, nome, icone").order("nome");

    if (error) {
      listError = error.message;
    } else if (data) {
      categorias = data as CategoriaListRow[];
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
          <p className="mt-2 text-xs text-amber-800/80">
            Crie <code className="rounded bg-black/5 px-1">.env</code> ou{" "}
            <code className="rounded bg-black/5 px-1">.env.local</code> com NEXT_PUBLIC_SUPABASE_URL e
            NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
        </div>
      )}

      {!configError && showOk && (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm"
          role="status"
        >
          <p className="font-semibold text-emerald-900">Categoria cadastrada</p>
          <p className="mt-1 text-emerald-800/95">Ela já pode ser usada ao cadastrar ou editar produtos.</p>
        </div>
      )}

      {!configError && listError && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 shadow-sm"
          role="alert"
        >
          <p className="font-semibold">Banco de dados</p>
          <p className="mt-1">
            Não foi possível carregar categorias: {listError}. Se as tabelas ainda não existem, rode o SQL em{" "}
            <code className="rounded bg-gray-100 px-1">supabase/migrations/20260411120000_categorias.sql</code>
            .
          </p>
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Categorias de produto</h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-start">
          {!configError && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <h3 className="text-base font-semibold text-gray-900">Nova categoria</h3>
              <p className="mt-1 text-sm text-gray-500">Ex.: Freios, Filtros, Correias.</p>
              <div className="mt-6">
                <CategoriaForm />
              </div>
            </div>
          )}

          {!configError && (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-base font-semibold text-gray-900">Categorias cadastradas</h3>
              </div>

              {listError && (
                <p className="px-6 py-6 text-sm text-red-700">Não foi possível listar categorias.</p>
              )}

              {!listError && categorias.length === 0 && (
                <p className="px-6 py-10 text-center text-sm text-gray-500">
                  Nenhuma categoria ainda. Cadastre a primeira ao lado ou ao{" "}
                  <Link href="/admin/produtos/novo" className="font-medium text-admin-accent hover:underline">
                    cadastrar produto
                  </Link>
                  .
                </p>
              )}

              {!listError && categorias.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="w-14 px-4 py-3 font-semibold normal-case tracking-normal">Ícone</th>
                        <th className="px-6 py-3">Nome</th>
                        <th className="w-[1%] px-4 py-3 text-right font-semibold normal-case tracking-normal">
                          <span className="sr-only">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {categorias.map((c) => (
                        <CategoriaRow key={c.id} categoria={c} />
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
