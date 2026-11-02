import Link from "next/link";
import { KitsSection } from "@/features/kits/components/KitsSection";
import { getKitCategorias, getPublishedKits } from "@/features/kits/services/getHomeKits";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { storeShellContent, storeShellInset } from "@/config/storeShell";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function parseCategoria(sp: Record<string, string | string[] | undefined>): string | null {
  const raw = Array.isArray(sp.categoria) ? sp.categoria[0] : sp.categoria;
  return raw?.trim() || null;
}

export async function generateMetadata({ searchParams }: PageProps) {
  const slug = parseCategoria(await searchParams);
  if (!slug) return { title: "Kits | Accorsi" };
  const categorias = await getKitCategorias();
  const cat = categorias.find((c) => c.slug === slug);
  return { title: cat ? `Kits de ${cat.nome} | Accorsi` : "Kits | Accorsi" };
}

export default async function KitsPage({ searchParams }: PageProps) {
  const slug = parseCategoria(await searchParams);
  const [kits, categorias] = await Promise.all([getPublishedKits(slug), getKitCategorias()]);
  const atual = categorias.find((c) => c.slug === slug) ?? null;

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
      active
        ? "border-store-navy bg-store-navy text-white"
        : "border-store-navy/20 bg-white text-store-navy hover:border-store-navy/50"
    }`;

  return (
    <div className="flex min-h-dvh flex-col bg-store-cream font-sans text-store-navy">
      <div className={`${storeShellInset} flex-1 py-8 md:py-12`}>
        <div className={`${storeShellContent} space-y-6`}>
          {categorias.length > 0 ? (
            <nav aria-label="Categorias de kits" className="flex flex-wrap gap-2">
              <Link href="/kits" className={chip(!atual)}>
                Todos os kits
              </Link>
              {categorias.map((c) => (
                <Link key={c.id} href={`/kits?categoria=${c.slug}`} className={chip(atual?.id === c.id)}>
                  {c.nome}
                </Link>
              ))}
            </nav>
          ) : null}
          <KitsSection
            embedded
            kits={kits}
            title={atual ? `Kits de ${atual.nome}` : "Todos os kits"}
            emptyMessage="Nenhum kit disponível nesta categoria no momento."
          />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
