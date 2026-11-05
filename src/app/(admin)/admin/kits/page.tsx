import Link from "next/link";
import { Suspense } from "react";

import { AdminDashboardProductSearch } from "@/features/admin/components/AdminDashboardProductSearch";
import { AdminCatalogTabs } from "@/features/kits/components/AdminCatalogTabs";
import { KitCreateButton } from "@/features/kits/components/KitCreateButton";
import { KitRowActions } from "@/features/kits/components/KitRowActions";
import { ProductStatusBadge } from "@/features/produtos/components/ProductStatusBadge";
import { normalizeProductSearchInput } from "@/features/produtos/services/productSearchMatchingIds";
import {
  formatKitStatusBadge,
  parseKitStatus,
  type KitStatus,
} from "@/features/kits/utils/kitStatus";
import { createClient } from "@/services/supabase/server";

export const metadata = { title: "Kits | Admin" };

type KitRow = {
  id: string;
  nome: string | null;
  slug: string | null;
  status: KitStatus;
};

type StatusFilter = "all" | KitStatus;

function parseStatusFilter(raw: string | undefined): StatusFilter {
  if (raw === "draft" || raw === "published") return raw;
  return "all";
}

function statusFilterHref(status: StatusFilter, q: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status !== "all") params.set("status", status);
  const qs = params.toString();
  return qs ? `/admin/kits?${qs}` : "/admin/kits";
}

export default async function AdminKitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; status?: string | string[]; erro?: string | string[] }>;
}) {
  const sp = await searchParams;
  const rawQ = typeof sp.q === "string" ? sp.q : Array.isArray(sp.q) ? sp.q[0] : "";
  const searchTerm = normalizeProductSearchInput(rawQ);
  const rawStatus =
    typeof sp.status === "string" ? sp.status : Array.isArray(sp.status) ? sp.status[0] : "";
  const statusFilter = parseStatusFilter(rawStatus);
  const rawErro = typeof sp.erro === "string" ? sp.erro : Array.isArray(sp.erro) ? sp.erro[0] : "";

  let kits: KitRow[] = [];
  let loadError: string | null = null;

  try {
    const supabase = await createClient();
    let query = supabase.from("kits").select("id, nome, slug, status").order("nome");
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (searchTerm) {
      const pattern = `%${searchTerm}%`;
      const [a, b] = await Promise.all([
        supabase.from("kits").select("id, nome, slug, status").ilike("nome", pattern),
        supabase.from("kits").select("id, nome, slug, status").ilike("slug", pattern),
      ]);
      const err = a.error?.message ?? b.error?.message;
      if (err) loadError = err;
      else {
        const map = new Map<string, KitRow>();
        for (const row of [...(a.data ?? []), ...(b.data ?? [])]) {
          if (statusFilter !== "all" && parseKitStatus(row.status) !== statusFilter) continue;
          map.set(row.id, {
            id: row.id,
            nome: row.nome,
            slug: row.slug,
            status: parseKitStatus(row.status),
          });
        }
        kits = [...map.values()].sort((x, y) =>
          (x.nome ?? "").localeCompare(y.nome ?? "", "pt-BR", { sensitivity: "base" }),
        );
      }
    } else {
      const { data, error } = await query;
      if (error) loadError = error.message;
      else {
        kits = (data ?? []).map((row) => ({
          id: row.id,
          nome: row.nome,
          slug: row.slug,
          status: parseKitStatus(row.status),
        }));
      }
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Erro ao carregar kits.";
  }

  const chips: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "draft", label: "Em cadastro" },
    { key: "published", label: "Publicados" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminCatalogTabs active="kits" />
        <Link
          href="/admin/kits/combo"
          className="rounded-lg border border-admin-accent px-4 py-2 text-sm font-semibold text-admin-accent hover:bg-blue-50"
        >
          Descontos e combo com óleo
        </Link>
      </div>

      {rawErro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950" role="alert">
          {rawErro}
        </div>
      )}
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950" role="alert">
          {loadError}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Lista de kits</h2>
            <p className="mt-0.5 text-sm text-gray-500">Monte combos a partir de produtos existentes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Link
                  key={chip.key}
                  href={statusFilterHref(chip.key, searchTerm ?? "")}
                  className={
                    statusFilter === chip.key
                      ? "rounded-full bg-admin-accent px-3 py-1 text-xs font-semibold text-white"
                      : "rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  }
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <Suspense fallback={<div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-gray-100" />}>
              <AdminDashboardProductSearch />
            </Suspense>
            <KitCreateButton />
          </div>
        </div>

        {kits.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500">Nenhum kit encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3">Kit</th>
                  <th className="px-6 py-3">Slug</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kits.map((k) => (
                  <tr key={k.id} className="hover:bg-gray-50/80">
                    <td className="px-6 py-4 font-medium">{k.nome?.trim() || "Sem nome"}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{k.slug || "—"}</td>
                    <td className="px-6 py-4 text-center">
                      <ProductStatusBadge status={k.status} />
                      <span className="sr-only">{formatKitStatusBadge(k.status)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <KitRowActions kitId={k.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
