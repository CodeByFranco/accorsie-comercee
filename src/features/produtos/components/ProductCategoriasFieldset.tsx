import Link from "next/link";

export type CategoriaOption = { id: string; nome: string; icone: string | null };

export function ProductCategoriasFieldset({
  categorias,
  selectedIds,
}: {
  categorias: CategoriaOption[];
  /** Na edição: IDs já vinculados ao produto. */
  selectedIds?: string[];
}) {
  const selected = new Set(selectedIds ?? []);

  return (
    <fieldset className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      <legend className="px-0.5 text-sm font-medium text-gray-800">Categorias</legend>

      {categorias.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">
          Nenhuma categoria cadastrada.{" "}
          <Link href="/admin/categorias" className="font-medium text-admin-accent hover:underline">
            Cadastre em Categorias
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
          {categorias.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-800">
                <input
                  type="checkbox"
                  name="categoria_ids"
                  value={c.id}
                  defaultChecked={selected.has(c.id)}
                  className="rounded border-gray-300 text-admin-accent focus:ring-admin-accent"
                />
                {c.icone ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.icone}
                    alt=""
                    className="h-7 w-7 shrink-0 object-contain"
                    width={28}
                    height={28}
                  />
                ) : null}
                <span>{c.nome}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
