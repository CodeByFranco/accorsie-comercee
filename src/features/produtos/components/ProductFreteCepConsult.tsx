"use client";

import { useMemo, useState } from "react";

import { useFreteQuote } from "@/features/frete/hooks/useFreteQuote";
import { formatCep } from "@/features/pedidos/utils/pedidoDisplay";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type ProductFreteCepConsultProps = {
  productId: string;
  /** Quantidade usada na cotação (padrão 1). */
  quantidade?: number;
  somenteRetiradaLoja?: boolean;
};

function onlyDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

export function ProductFreteCepConsult({
  productId,
  quantidade = 1,
  somenteRetiradaLoja = false,
}: ProductFreteCepConsultProps) {
  if (somenteRetiradaLoja) {
    return (
      <div className="space-y-1 pt-1">
        <p className="text-xs font-semibold text-store-navy">Entrega</p>
        <p className="text-sm text-store-navy-muted">
          Este produto está disponível <strong className="text-store-navy">somente para retirada na loja</strong>.
          Não é possível calcular frete para envio.
        </p>
      </div>
    );
  }

  const [inputCep, setInputCep] = useState("");
  const [cepConsulta, setCepConsulta] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const itens = useMemo(
    () => [{ produto_id: productId, quantidade: Math.max(1, Math.min(999, quantidade)) }],
    [productId, quantidade],
  );

  const frete = useFreteQuote(itens, cepConsulta, cepConsulta.length === 8);

  function handleCalcular() {
    const d = onlyDigits(inputCep);
    if (d.length !== 8) {
      setLocalError("Informe um CEP com 8 dígitos.");
      return;
    }
    setLocalError(null);
    setCepConsulta(d);
  }

  const showResult = cepConsulta.length === 8;

  return (
    <div className="space-y-2 pt-1">
      <label htmlFor="cep-frete-produto" className="block text-xs font-semibold text-store-navy">
        Consultar frete (CEP)
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          id="cep-frete-produto"
          name="cep_frete"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={inputCep}
          onChange={(e) => {
            const d = onlyDigits(e.target.value);
            setInputCep(d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`);
            setLocalError(null);
          }}
          className="w-full min-w-0 flex-1 rounded-full bg-store-subtle/60 px-4 py-2.5 text-sm text-store-navy outline-none ring-0 transition placeholder:text-store-navy-muted focus:bg-white focus:ring-2 focus:ring-store-accent"
        />
        <button
          type="button"
          onClick={handleCalcular}
          className="shrink-0 rounded-full border border-store-line bg-white px-4 py-2.5 text-sm font-semibold text-store-navy transition hover:bg-store-subtle/50"
        >
          Calcular
        </button>
      </div>
      {localError ? <p className="text-xs text-red-700">{localError}</p> : null}
      {showResult ? (
        <div className="rounded-lg border border-store-line/70 bg-store-subtle/25 px-3 py-2 text-sm text-store-navy">
          {frete.loading ? (
            <p className="text-store-navy-muted">Calculando frete para {formatCep(cepConsulta)}…</p>
          ) : frete.error ? (
            <p className="text-red-800">{frete.error}</p>
          ) : frete.opcoes.length > 0 ? (
            <ul className="space-y-1.5">
              {frete.opcoes.map((op) => (
                <li key={op.id} className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <span className="text-store-navy">
                    {op.nome}
                    {typeof op.prazoDiasUteis === "number" ? (
                      <span className="text-store-navy-muted"> · {op.prazoDiasUteis} dias úteis</span>
                    ) : null}
                  </span>
                  <span className="font-semibold tabular-nums text-black">{money.format(op.precoCentavos / 100)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-store-navy-muted">Nenhuma opção retornada para este CEP.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
