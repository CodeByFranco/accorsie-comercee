import { redirect } from "next/navigation";

import { AccountAreaContent } from "@/features/auth/components/AccountAreaContent";
import { AuthPageShell } from "@/features/auth/components/AuthPageShell";
import { getCashbackConfig } from "@/features/cashback/cashbackConfig";
import { CashbackResumo } from "@/features/cashback/components/CashbackResumo";
import { sincronizarPagamentosDoCliente } from "@/features/pedidos/services/sincronizarPagamentosDoCliente";
import { listMyPedidos } from "@/features/pedidos/services/listMyPedidos";
import { profileRowToEndereco } from "@/types/profileDelivery";
import { createClient } from "@/services/supabase/server";

type ContaPageProps = {
  searchParams?: Promise<{ aba?: string }>;
};

export default async function ContaPage({ searchParams }: ContaPageProps) {
  const supabase = await createClient();
  const params = searchParams ? await searchParams : undefined;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/conta");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "nome_completo, telefone, cep, logradouro, numero, complemento, bairro, cidade, uf, role",
    )
    .eq("id", user.id)
    .maybeSingle();

  const nomeCompleto = profile?.nome_completo ?? "";
  const showAdminLink = profile?.role === "admin";
  const email = user.email ?? "";
  const initialEndereco = profileRowToEndereco(profile ?? null);
  const { data: garageVehicles } = await supabase
    .from("garagem_veiculos")
    .select("id, placa, marca, modelo, ano, modelo_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const { data: saldoCashbackRaw } = await supabase.rpc("meu_saldo_cashback");
  const { data: cashbackTransacoes } = await supabase
    .from("cashback_transacoes")
    .select("id, tipo, valor, descricao, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  await sincronizarPagamentosDoCliente(user.id);
  const pedidos = await listMyPedidos();
  const initialSection =
    params?.aba === "garagem" ? "garagem" : params?.aba === "pedidos" ? "pedidos" : "conta";

  const cashbackConfig = await getCashbackConfig();

  return (
    <AuthPageShell
      title="Minha conta"
      description="Dados pessoais, pedidos e canais de atendimento."
      cardMaxWidthClassName="w-full max-w-store"
    >
      <CashbackResumo
        saldo={Math.max(0, Number(saldoCashbackRaw) || 0)}
        transacoes={cashbackTransacoes ?? []}
        config={cashbackConfig}
      />
      <AccountAreaContent
        initialNomeCompleto={nomeCompleto}
        email={email}
        initialEndereco={initialEndereco}
        garageVehicles={garageVehicles ?? []}
        pedidos={pedidos}
        initialSection={initialSection}
        showAdminLink={showAdminLink}
      />
    </AuthPageShell>
  );
}
