import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { getStorePickupAddress } from "@/config/storePickupAddress";
import { CheckoutPage } from "@/features/checkout/components/CheckoutPage";
import { profileRowToEndereco } from "@/types/profileDelivery";
import { createClient } from "@/services/supabase/server";

export default async function CheckoutRoutePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/checkout");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "nome_completo, telefone, cep, logradouro, numero, complemento, bairro, cidade, uf",
    )
    .eq("id", user.id)
    .maybeSingle();

  const defaultDestinatarioNome =
    typeof profile?.nome_completo === "string" ? profile.nome_completo : "";
  const initialEndereco = profileRowToEndereco(profile ?? null);
  const lojaRetirada = getStorePickupAddress();
  const { data: saldoRaw } = await supabase.rpc("meu_saldo_cashback");
  const saldoCashback = Math.max(0, Number(saldoRaw) || 0);

  return (
    <div className="flex min-h-dvh flex-col bg-store-cream font-sans text-store-navy">
      <main className="flex flex-1 flex-col">
        <CheckoutPage
          defaultDestinatarioNome={defaultDestinatarioNome}
          initialEndereco={initialEndereco}
          lojaRetirada={lojaRetirada}
          saldoCashback={saldoCashback}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
