import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { PedidosListSection } from "@/features/pedidos/components/PedidosListSection";
import { sincronizarPagamentosDoCliente } from "@/features/pedidos/services/sincronizarPagamentosDoCliente";
import { listMyPedidos } from "@/features/pedidos/services/listMyPedidos";
import { createClient } from "@/services/supabase/server";
import { storeShellContent, storeShellInset } from "@/config/storeShell";

export const metadata: Metadata = {
  title: "Meus pedidos",
};

export default async function PedidosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/pedidos");
  }

  await sincronizarPagamentosDoCliente(user.id);
  const pedidos = await listMyPedidos();

  return (
    <div className="flex min-h-dvh flex-col bg-store-cream font-sans text-store-navy">
      <main className={`flex flex-1 flex-col py-10 sm:py-14 ${storeShellInset}`}>
        <div className={storeShellContent}>
          <div className="mx-auto w-full max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight text-store-navy sm:text-3xl">Meus pedidos</h1>
            <p className="mt-2 text-sm text-store-navy-muted">
              Acompanhe o status e os detalhes das suas compras.
            </p>
            <div className="mt-8">
              <PedidosListSection pedidos={pedidos} />
            </div>
            <p className="mt-8 text-center text-sm text-store-navy-muted">
              <Link href="/conta" className="font-semibold text-store-navy underline underline-offset-2">
                Minha conta
              </Link>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
