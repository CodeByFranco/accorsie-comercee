import { storeShellContent, storeShellInset } from "@/config/storeShell";

/**
 * Esqueleto neutro da vitrine (home e páginas sem `loading.tsx` próprio): a navbar do layout
 * aparece na hora e o conteúdo entra por streaming, em vez de tela parada até tudo carregar.
 */
export default function PublicLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-store-cream font-sans text-store-navy" aria-busy="true">
      <section className={`flex-1 py-8 sm:py-10 ${storeShellInset}`}>
        <div className={`${storeShellContent} flex flex-col gap-8`}>
          <div className="h-28 w-full animate-pulse rounded-2xl bg-store-navy/10" aria-hidden />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" aria-hidden />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-sm bg-white shadow-sm" aria-hidden />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
