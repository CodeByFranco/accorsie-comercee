import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SobreBlocosView } from "@/features/site-layout/components/SobreBlocosView";
import { getStoreSobreBlocos } from "@/features/site-layout/services/getSobreBlocos";

export const metadata: Metadata = {
  title: "Quem somos | Accorsi Auto Peças",
  description:
    "A Accorsi Auto Peças atua desde 2016 na reposição de peças automotivas. Empresa familiar, com origem no segmento de auto elétrica.",
};

export default async function SobrePage() {
  const { blocos } = await getStoreSobreBlocos();

  return (
    <div className="flex min-h-dvh flex-col bg-white text-store-navy">
      <main>
        <SobreBlocosView blocos={blocos} />
      </main>
      <SiteFooter />
    </div>
  );
}
