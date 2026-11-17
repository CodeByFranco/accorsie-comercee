import { SiteLayoutForm } from "@/features/site-layout/components/SiteLayoutForm";
import { getSiteLayout } from "@/features/site-layout/services/getSiteLayout";
import { emptySiteLayoutRow } from "@/features/site-layout/utils/homeBannerUrls";
import type { SiteLayoutRow } from "@/types/siteLayout";

export const metadata = {
  title: "Layout do site | Admin",
};

export default async function AdminSiteLayoutPage() {
  let initial: SiteLayoutRow;
  let loadError: string | null = null;

  try {
    initial = await getSiteLayout();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Erro ao carregar.";
    initial = emptySiteLayoutRow();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-gray-500">Layout</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">Site</h2>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Ajuste o que os visitantes veem na vitrine. As alterações entram na página inicial após salvar.
        </p>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm" role="alert">
          <p className="font-semibold">Configuração</p>
          <p className="mt-1">{loadError}</p>
        </div>
      )}

      <SiteLayoutForm initial={initial} />
    </div>
  );
}
