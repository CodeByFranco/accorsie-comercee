import Link from "next/link";
import { Suspense } from "react";

import { AdminDashboardProductSearch } from "@/features/admin/components/AdminDashboardProductSearch";
import { AdminCatalogTabs } from "@/features/kits/components/AdminCatalogTabs";
import { AdminProdutosListagemTabela } from "@/features/produtos/components/AdminProdutosListagemTabela";
import { AdminProdutosPagination } from "@/features/produtos/components/AdminProdutosPagination";
import { ProductCompatReportButton } from "@/features/produtos/components/ProductCompatReportButton";
import { ProductCreateButton } from "@/features/produtos/components/ProductCreateButton";
import { ProductWegaImportButton } from "@/features/produtos/components/ProductWegaImportButton";
import { RevealValorEstoque } from "@/features/produtos/components/RevealValorEstoque";
import { normalizeProductSearchInput } from "@/features/produtos/services/productSearchMatchingIds";
import {
  parseProductStatus,
  type ProductStatus,
} from "@/features/produtos/utils/productStatus";
import { createClient } from "@/services/supabase/server";

export const metadata = {
  title: "Produtos | Admin",
};

const ADMIN_PRODUTOS_PAGE_SIZE = 50;

type ProdutoRow = {
  id: string;
  titulo: string | null;
  cod_produto: string | null;
  foto: string | null;
  valor: number | null;
  quantidade_estoque: number;
  em_destaque: boolean;
  status: ProductStatus;
};

type KpiRow = { valor: number; quantidade_estoque: number };

const PRODUTO_LIST_SELECT =
  "id, titulo, cod_produto, foto, valor, quantidade_estoque, em_destaque, status" as const;

type StatusFilter = "all" | ProductStatus;

function parseStatusFilter(raw: string | undefined): StatusFilter {
  if (raw === "draft" || raw === "published") return raw;
  return "all";
}

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function mergeProdutosById(a: ProdutoRow[], b: ProdutoRow[]): ProdutoRow[] {
  const map = new Map<string, ProdutoRow>();
  for (const row of a) map.set(row.id, row);
  for (const row of b) map.set(row.id, row);
  return [...map.values()].sort((x, y) =>
    (x.titulo ?? "").localeCompare(y.titulo ?? "", "pt-BR", { sensitivity: "base" })
  );
}

function computeKpiStats(rows: KpiRow[]) {
  const n = rows.length;
  const totalItens = rows.reduce((s, p) => s + Number(p.quantidade_estoque), 0);
  const valorEstoque = rows.reduce(
    (s, p) => s + Number(p.valor) * Number(p.quantidade_estoque),
    0
  );
  const esgotados = rows.filter((p) => Number(p.quantidade_estoque) <= 0).length;
  const ultimaUnidade = rows.filter((p) => Number(p.quantidade_estoque) === 1).length;
  return { n, totalItens, valorEstoque, esgotados, ultimaUnidade };
}

function statusFilterHref(status: StatusFilter, q: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status !== "all") params.set("status", status);
  const qs = params.toString();
  return qs ? `/admin/produtos?${qs}` : "/admin/produtos";
}

export default async function AdminProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    erro?: string | string[];
    page?: string | string[];
  }>;
}) {
  let produtos: ProdutoRow[] = [];
  let loadError: string | null = null;
  let listTotal = 0;

  const sp = await searchParams;
  const rawQ = typeof sp.q === "string" ? sp.q : Array.isArray(sp.q) ? sp.q[0] : "";
  const searchTerm = normalizeProductSearchInput(rawQ);
  const rawStatus =
    typeof sp.status === "string" ? sp.status : Array.isArray(sp.status) ? sp.status[0] : "";
  const statusFilter = parseStatusFilter(rawStatus);
  const rawErro = typeof sp.erro === "string" ? sp.erro : Array.isArray(sp.erro) ? sp.erro[0] : "";
  const requestedPage = parsePage(
    typeof sp.page === "string" ? sp.page : Array.isArray(sp.page) ? sp.page[0] : undefined
  );

  let kpiRows: KpiRow[] = [];

  try {
    const supabase = await createClient();
    const mapProdutoRows = (rows: unknown): ProdutoRow[] =>
      (rows as Array<Omit<ProdutoRow, "status" | "em_destaque"> & { status?: unknown; em_destaque?: unknown }>).map(
        (row) => ({
          ...row,
          em_destaque: Boolean(row.em_destaque),
          status: parseProductStatus(row.status),
        })
      );

    const applyStatus = <T extends { eq: (col: string, val: string) => T }>(query: T): T => {
      if (statusFilter === "all") return query;
      return query.eq("status", statusFilter);
    };

    let kpiQuery = supabase.from("produtos").select("valor, quantidade_estoque");
    kpiQuery = applyStatus(kpiQuery);

    if (!searchTerm) {
      let countQuery = supabase
        .from("produtos")
        .select("id", { count: "exact", head: true });
      countQuery = applyStatus(countQuery);

      const countResEarly = await countQuery;
      if (countResEarly.error) {
        loadError = countResEarly.error.message;
      } else {
        listTotal = countResEarly.count ?? 0;
        const totalPagesEarly = listTotal > 0 ? Math.ceil(listTotal / ADMIN_PRODUTOS_PAGE_SIZE) : 0;
        const safePage =
          totalPagesEarly > 0 && requestedPage > totalPagesEarly ? totalPagesEarly : requestedPage;
        const from = (safePage - 1) * ADMIN_PRODUTOS_PAGE_SIZE;
        const to = from + ADMIN_PRODUTOS_PAGE_SIZE - 1;
        let listQuery = supabase
          .from("produtos")
          .select(PRODUTO_LIST_SELECT)
          .order("titulo")
          .range(from, to);
        listQuery = applyStatus(listQuery);

        const [kpiRes, listRes] = await Promise.all([kpiQuery, listQuery]);

        const err = kpiRes.error?.message ?? listRes.error?.message ?? null;
        if (err) {
          loadError = err;
        } else {
          kpiRows = (kpiRes.data ?? []) as KpiRow[];
          produtos = mapProdutoRows(listRes.data ?? []);
        }
      }
    } else {
      const pattern = `%${searchTerm}%`;
      let tituloQuery = supabase.from("produtos").select(PRODUTO_LIST_SELECT).ilike("titulo", pattern);
      tituloQuery = applyStatus(tituloQuery);
      let codQuery = supabase.from("produtos").select(PRODUTO_LIST_SELECT).ilike("cod_produto", pattern);
      codQuery = applyStatus(codQuery);

      const [kpiRes, tituloRes, codRes] = await Promise.all([kpiQuery, tituloQuery, codQuery]);

      const err =
        kpiRes.error?.message ?? tituloRes.error?.message ?? codRes.error?.message ?? null;
      if (err) {
        loadError = err;
      } else {
        kpiRows = (kpiRes.data ?? []) as KpiRow[];
        const merged = mergeProdutosById(
          mapProdutoRows(tituloRes.data ?? []),
          mapProdutoRows(codRes.data ?? [])
        );
        listTotal = merged.length;
        const totalPagesSearch = listTotal > 0 ? Math.ceil(listTotal / ADMIN_PRODUTOS_PAGE_SIZE) : 0;
        const safePage =
          totalPagesSearch > 0 && requestedPage > totalPagesSearch ? totalPagesSearch : requestedPage;
        const from = (safePage - 1) * ADMIN_PRODUTOS_PAGE_SIZE;
        produtos = merged.slice(from, from + ADMIN_PRODUTOS_PAGE_SIZE);
      }
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Erro ao carregar produtos.";
  }

  const { n, totalItens, valorEstoque, esgotados, ultimaUnidade } = computeKpiStats(kpiRows);
  const totalPages = listTotal > 0 ? Math.ceil(listTotal / ADMIN_PRODUTOS_PAGE_SIZE) : 0;
  const page = totalPages > 0 && requestedPage > totalPages ? totalPages : requestedPage;

  const filterChips: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "draft", label: "Em cadastro" },
    { key: "published", label: "Publicados" },
  ];

  return (
    <div className="space-y-6">
      <AdminCatalogTabs active="produtos" />

      {rawErro && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 shadow-sm"
          role="alert"
        >
          <p className="font-semibold">Não foi possível criar o produto</p>
          <p className="mt-1">{rawErro}</p>
        </div>
      )}

      {loadError && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 shadow-sm"
          role="alert"
        >
          <p className="font-semibold">Erro ao carregar</p>
          <p className="mt-1">{loadError}</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Produtos</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{n}</p>
        </article>
        <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Itens em estoque</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{totalItens}</p>
        </article>
        <RevealValorEstoque valor={valorEstoque} />
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0 shrink">
            <h2 className="text-base font-semibold text-gray-900">Lista de produtos</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {searchTerm
                ? `Filtrando por nome ou código · ${listTotal} resultado${listTotal === 1 ? "" : "s"}`
                : "Pesquise, edite e gerencie o catálogo"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {filterChips.map((chip) => {
                const active = statusFilter === chip.key;
                return (
                  <Link
                    key={chip.key}
                    href={statusFilterHref(chip.key, searchTerm ?? "")}
                    className={
                      active
                        ? "rounded-full bg-admin-accent px-3 py-1 text-xs font-semibold text-white"
                        : "rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                    }
                  >
                    {chip.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <Suspense
              fallback={
                <div
                  className="h-10 w-full max-w-md shrink-0 animate-pulse rounded-lg bg-gray-100 lg:mt-0.5"
                  aria-hidden
                />
              }
            >
              <AdminDashboardProductSearch />
            </Suspense>
            <div className="flex flex-wrap items-stretch gap-2 lg:items-center">
              <ProductWegaImportButton />
              <ProductCompatReportButton />
              <ProductCreateButton />
            </div>
          </div>
        </div>

        {ultimaUnidade > 0 && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-950" role="status">
            <p className="font-semibold">Atenção: última unidade em estoque</p>
            <p className="mt-1 text-amber-900/95">
              {ultimaUnidade === 1
                ? "Há 1 produto com apenas uma unidade disponível. Reposição recomendada."
                : `Há ${ultimaUnidade} produtos com apenas uma unidade disponível. Reposição recomendada.`}
            </p>
          </div>
        )}
        {esgotados > 0 && (
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 text-sm text-gray-700">
            {esgotados} produto{esgotados > 1 ? "s" : ""} sem estoque.
          </div>
        )}

        {produtos.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500">
            {searchTerm || statusFilter !== "all"
              ? "Nenhum produto encontrado para esse filtro."
              : "Nenhum produto cadastrado ainda."}
          </p>
        ) : (
          <>
            <AdminProdutosListagemTabela produtos={produtos} />
            <AdminProdutosPagination
              page={page}
              totalPages={totalPages}
              total={listTotal}
              pageSize={ADMIN_PRODUTOS_PAGE_SIZE}
              q={searchTerm ?? ""}
              status={statusFilter}
            />
          </>
        )}
      </section>
    </div>
  );
}
