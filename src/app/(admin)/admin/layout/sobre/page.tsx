import Link from "next/link";

import { SobreBlocosEditor } from "@/features/site-layout/components/SobreBlocosEditor";
import { getSiteInstitucional } from "@/features/site-layout/services/getSiteInstitucional";
import { getSobreBlocos } from "@/features/site-layout/services/getSobreBlocos";

export const metadata = {
  title: "Página Sobre | Admin",
};

export default async function AdminSobrePage() {
  const [{ blocos, personalizado }, institucional] = await Promise.all([getSobreBlocos(), getSiteInstitucional()]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/layout" className="text-sm font-medium text-gray-500 hover:text-gray-700">
          ← Layout
        </Link>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">Página Sobre (Quem somos)</h2>
      </div>

      <SobreBlocosEditor
        initial={blocos}
        personalizado={personalizado}
        manifestoPadrao={institucional.manifesto_texto}
      />
    </div>
  );
}
