import { ContasServicosPainel } from "@/features/contas-servicos/components/ContasServicosPainel";
import { listarContasServicos } from "@/features/contas-servicos/services/contasServicos";

export const metadata = {
  title: "Contas | Admin",
};

export default async function AdminContasPage() {
  const { contas, erro } = await listarContasServicos();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Contas de serviços</h1>
      <p className="mt-1 text-sm text-gray-600">
        Acessos do Melhor Envio, da API de placas e de outros serviços pagos. As senhas ficam
        criptografadas e só aparecem ao clicar em &quot;mostrar&quot;, por 30 segundos.
      </p>
      {erro ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {erro}
        </p>
      ) : null}
      <div className="mt-6">
        <ContasServicosPainel contas={contas} />
      </div>
    </div>
  );
}
