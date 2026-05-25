"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { storeShellContent, storeShellInset } from "@/config/storeShell";
import type { StorePickupAddress } from "@/config/storePickupAddress";
import { formatStorePickupAddress } from "@/config/storePickupAddress";
import { useCart } from "@/features/carrinho/CartContext";
import { lookupCep } from "@/features/endereco/services/lookupCep";
import { useFreteQuote } from "@/features/frete/hooks/useFreteQuote";
import type { CheckoutPayload } from "@/features/checkout/types";
import { criarPedidoECheckout } from "@/features/checkout/services/criarPedidoECheckout";
import { previewCupomDesconto } from "@/features/checkout/services/previewCupomDesconto";
import type { FormaPagamentoCheckout } from "@/features/produtos/utils/paymentDiscount";
import { cartRequiresSomenteRetirada } from "@/features/produtos/utils/mapProductSummaryRow";
import { unitPriceAfterPaymentDiscount } from "@/features/produtos/utils/paymentDiscount";
import type { ProfileEndereco } from "@/types/profileDelivery";
import { emptyProfileEndereco } from "@/types/profileDelivery";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const inputClass =
  "mt-1 block w-full rounded-md border border-store-line bg-white px-3 py-2 text-sm text-store-navy shadow-sm outline-none transition placeholder:text-store-navy-muted/70 focus:border-store-navy focus:ring-1 focus:ring-store-navy";

type CheckoutPageProps = {
  defaultDestinatarioNome?: string;
  initialEndereco?: ProfileEndereco;
  /** Quando configurado no ambiente, exibe opção de retirada na loja (sem frete). */
  lojaRetirada?: StorePickupAddress | null;
};

type ModoEntrega = "envio" | "retirada";

export function CheckoutPage({
  defaultDestinatarioNome = "",
  initialEndereco = emptyProfileEndereco(),
  lojaRetirada = null,
}: CheckoutPageProps) {
  const baseId = useId();
  const { lines, itemCount, isReady } = useCart();
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoCheckout>("cartao");
  const hasItems = lines.length > 0;
  const subtotal = useMemo(
    () =>
      lines.reduce((s, l) => {
        const unit = unitPriceAfterPaymentDiscount(
          l.valor,
          formaPagamento,
          l.desconto_pix_percent,
          l.desconto_cartao_percent,
        );
        return s + unit * l.quantity;
      }, 0),
    [lines, formaPagamento],
  );

  const [destinatarioNome, setDestinatarioNome] = useState(() => defaultDestinatarioNome.trim());
  const [telefone, setTelefone] = useState(() => initialEndereco.telefone);
  const [destinatarioDocumento, setDestinatarioDocumento] = useState("");
  const [cep, setCep] = useState(() => initialEndereco.cep);
  const [logradouro, setLogradouro] = useState(() => initialEndereco.logradouro);
  const [numero, setNumero] = useState(() => initialEndereco.numero);
  const [complemento, setComplemento] = useState(() => initialEndereco.complemento);
  const [bairro, setBairro] = useState(() => initialEndereco.bairro);
  const [cidade, setCidade] = useState(() => initialEndereco.cidade);
  const [uf, setUf] = useState(() => initialEndereco.uf);
  const touchedEnderecoRef = useRef({
    logradouro: false,
    bairro: false,
    cidade: false,
    uf: false,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [modoEntrega, setModoEntrega] = useState<ModoEntrega>("envio");
  const exigeRetiradaLoja = useMemo(() => cartRequiresSomenteRetirada(lines), [lines]);

  useEffect(() => {
    if (exigeRetiradaLoja) {
      setModoEntrega("retirada");
    }
  }, [exigeRetiradaLoja]);

  const itensPayload = useMemo(
    () => lines.map((l) => ({ produto_id: l.id, quantidade: l.quantity })),
    [lines],
  );
  const frete = useFreteQuote(
    itensPayload,
    cep,
    modoEntrega === "envio" && hasItems && !exigeRetiradaLoja,
  );
  const shipping =
    !hasItems ? 0 : modoEntrega === "retirada" ? 0 : frete.freteValue;
  const [cupomInput, setCupomInput] = useState("");
  const [cupomDesconto, setCupomDesconto] = useState<number | null>(null);
  const [cupomMensagem, setCupomMensagem] = useState<string | null>(null);
  const [cupomBusy, setCupomBusy] = useState(false);
  const total = Math.max(0, subtotal + shipping - (cupomDesconto ?? 0));

  useEffect(() => {
    setCupomDesconto(null);
    setCupomMensagem(null);
  }, [subtotal, shipping, itemCount, modoEntrega, frete.selectedId]);

  useEffect(() => {
    const cepDigits = cep.replace(/\D/g, "").slice(0, 8);
    if (cepDigits.length !== 8) {
      return;
    }
    const ac = new AbortController();
    void lookupCep(cepDigits, ac.signal)
      .then((data) => {
        if (!data) return;
        setLogradouro((prev) =>
          touchedEnderecoRef.current.logradouro && prev.trim() ? prev : (data.logradouro || prev),
        );
        setBairro((prev) =>
          touchedEnderecoRef.current.bairro && prev.trim() ? prev : (data.bairro || prev),
        );
        setCidade((prev) =>
          touchedEnderecoRef.current.cidade && prev.trim() ? prev : (data.cidade || prev),
        );
        setUf((prev) => (touchedEnderecoRef.current.uf && prev.trim() ? prev : (data.uf || prev)));
      })
      .catch(() => null);
    return () => ac.abort();
  }, [cep]);

  function onEnderecoFieldChange(
    field: "logradouro" | "bairro" | "cidade" | "uf",
    value: string,
    setter: (value: string) => void,
  ) {
    touchedEnderecoRef.current[field] = true;
    setter(value);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!hasItems) {
      setFormError("Seu carrinho está vazio. Adicione produtos antes de finalizar.");
      return;
    }
    if (exigeRetiradaLoja && modoEntrega !== "retirada") {
      setFormError(
        "Este pedido contém produtos disponíveis apenas para retirada na loja. Selecione retirada na loja.",
      );
      return;
    }

    if (modoEntrega === "envio" && !frete.selectedOption) {
      setFormError("Selecione uma opcao de frete antes de ir para o pagamento.");
      return;
    }

    const docDigits = destinatarioDocumento.replace(/\D/g, "");
    if (modoEntrega === "envio" && docDigits.length !== 11 && docDigits.length !== 14) {
      setFormError("Informe CPF (11 dígitos) ou CNPJ (14 dígitos) do destinatário para entrega.");
      return;
    }

    const retirada = exigeRetiradaLoja || modoEntrega === "retirada";
    if (retirada && !lojaRetirada) {
      setFormError("Retirada na loja nao esta disponivel no momento.");
      return;
    }

    const codigoCupom = cupomInput.trim();

    const payloadBase = retirada
      ? {
          itens: itensPayload,
          frete: 0,
          forma_pagamento: formaPagamento,
          destinatario_nome: destinatarioNome.trim(),
          telefone: telefone.trim(),
          cep: lojaRetirada!.cep,
          logradouro: lojaRetirada!.logradouro,
          numero: lojaRetirada!.numero,
          complemento: lojaRetirada!.complemento,
          bairro: lojaRetirada!.bairro,
          cidade: lojaRetirada!.cidade,
          uf: lojaRetirada!.uf,
          retirada_loja: true,
        }
      : {
          itens: itensPayload,
          frete: shipping,
          forma_pagamento: formaPagamento,
          destinatario_nome: destinatarioNome.trim(),
          telefone: telefone.trim(),
          destinatario_documento: docDigits || undefined,
          cep: cep.trim(),
          logradouro: logradouro.trim(),
          numero: numero.trim(),
          complemento: complemento.trim(),
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          uf: uf.trim().toUpperCase().slice(0, 2),
        };

    const payload: CheckoutPayload = {
      ...payloadBase,
      ...(codigoCupom ? { cupom_codigo: codigoCupom } : {}),
    };

    setCheckoutBusy(true);
    void (async () => {
      try {
        if (codigoCupom) {
          const prev = await previewCupomDesconto(codigoCupom, subtotal, shipping);
          if (!prev.ok) {
            setFormError(prev.message);
            return;
          }
        }
        const result = await criarPedidoECheckout(payload);
        if (result?.ok === false) {
          setFormError(result.message);
        }
      } catch {
        /* redirect() do servidor dispara rejeição controlada */
      } finally {
        setCheckoutBusy(false);
      }
    })();
  }

  async function onAplicarCupom() {
    setCupomMensagem(null);
    const c = cupomInput.trim();
    if (!c) {
      setCupomDesconto(null);
      setCupomMensagem("Digite o código do cupom.");
      return;
    }
    if (!exigeRetiradaLoja && modoEntrega === "envio" && !frete.selectedOption) {
      setCupomMensagem("Selecione o frete antes de aplicar o cupom.");
      return;
    }
    setCupomBusy(true);
    try {
      const r = await previewCupomDesconto(c, subtotal, shipping);
      if (r.ok) {
        setCupomDesconto(r.desconto);
        setCupomMensagem(`Desconto de ${money.format(r.desconto)} incorporado ao total.`);
      } else {
        setCupomDesconto(null);
        setCupomMensagem(r.message);
      }
    } finally {
      setCupomBusy(false);
    }
  }

  return (
    <div className={`flex flex-1 flex-col py-8 sm:py-10 ${storeShellInset}`}>
      <div className={storeShellContent}>
        <Link
          href="/carrinho"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-store-navy underline-offset-4 hover:text-store-accent hover:underline"
        >
          <span aria-hidden>←</span> Voltar ao carrinho
        </Link>

        <h1 className="mb-8 text-2xl font-bold tracking-tight text-black sm:text-3xl">Checkout</h1>

        {!isReady ? (
          <p className="text-sm text-store-navy-muted" role="status">
            Carregando carrinho…
          </p>
        ) : !hasItems ? (
          <div className="rounded-sm border border-store-line/80 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-black">Seu carrinho está vazio</p>
            <p className="mt-2 text-sm text-store-navy-muted">
              Adicione produtos ao carrinho para continuar com o pagamento.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/produtos"
                className="inline-flex min-w-[10rem] items-center justify-center rounded-full bg-store-accent px-6 py-2.5 text-sm font-bold text-black shadow-sm transition hover:brightness-95"
              >
                Ver produtos
              </Link>
              <Link
                href="/carrinho"
                className="inline-flex min-w-[10rem] items-center justify-center rounded-full border border-store-line bg-white px-6 py-2.5 text-sm font-semibold text-store-navy transition hover:bg-store-subtle"
              >
                Ir ao carrinho
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,20rem)] lg:items-start lg:gap-8">
            <div className="space-y-6">
              <section
                className="rounded-sm border border-store-line/80 bg-white p-5 shadow-sm sm:p-6"
                aria-labelledby={`${baseId}-entrega`}
              >
                <h2 id={`${baseId}-entrega`} className="text-lg font-bold text-black">
                  {modoEntrega === "retirada" ? "Retirada na loja" : "Dados de entrega"}
                </h2>
                <p className="mt-1 text-sm text-store-navy-muted">
                  {modoEntrega === "retirada"
                    ? "Sem envio pelos Correios ou transportadoras: você retira o pedido no balcão da loja."
                    : "Informe o endereço e um telefone para contato sobre a entrega."}
                </p>

                {formError ? (
                  <p
                    className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                    role="alert"
                  >
                    {formError}
                  </p>
                ) : null}

                {exigeRetiradaLoja ? (
                  <div className="mt-6 rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                    <p className="font-semibold">Somente retirada na loja</p>
                    <p className="mt-1 text-slate-700">
                      Um ou mais itens do carrinho não podem ser enviados. Este pedido será finalizado apenas com
                      retirada no balcão da loja.
                    </p>
                  </div>
                ) : lojaRetirada ? (
                  <fieldset className="mt-6 space-y-3">
                    <legend className="text-sm font-medium text-store-navy">Como deseja receber</legend>
                    <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-store-line bg-store-subtle/40 px-4 py-3 text-sm font-medium text-store-navy has-[:checked]:border-store-navy has-[:checked]:bg-white">
                      <input
                        type="radio"
                        name="modo_entrega"
                        checked={modoEntrega === "envio"}
                        onChange={() => setModoEntrega("envio")}
                        className="h-4 w-4 border-store-line text-store-navy focus:ring-store-navy"
                      />
                      Receber no endereço (frete via Melhor Envio)
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-store-line bg-store-subtle/40 px-4 py-3 text-sm font-medium text-store-navy has-[:checked]:border-store-navy has-[:checked]:bg-white">
                      <input
                        type="radio"
                        name="modo_entrega"
                        checked={modoEntrega === "retirada"}
                        onChange={() => setModoEntrega("retirada")}
                        className="h-4 w-4 border-store-line text-store-navy focus:ring-store-navy"
                      />
                      Retirar na loja — sem frete
                    </label>
                  </fieldset>
                ) : null}

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor={`${baseId}-nome`} className="text-sm font-medium text-store-navy">
                      Nome completo {modoEntrega === "retirada" ? "para retirada" : "do destinatário"}
                    </label>
                    <input
                      id={`${baseId}-nome`}
                      name="destinatario_nome"
                      autoComplete="name"
                      value={destinatarioNome}
                      onChange={(e) => setDestinatarioNome(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div className={modoEntrega === "retirada" ? "sm:col-span-2" : undefined}>
                    <label htmlFor={`${baseId}-tel`} className="text-sm font-medium text-store-navy">
                      Telefone / WhatsApp
                    </label>
                    <input
                      id={`${baseId}-tel`}
                      name="telefone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  {modoEntrega === "retirada" && lojaRetirada ? (
                    <div className="sm:col-span-2 rounded-md border border-store-line/80 bg-store-subtle/25 p-4 text-sm text-store-navy">
                      <p className="font-semibold text-black">Endereço da loja</p>
                      <p className="mt-2 leading-relaxed">{formatStorePickupAddress(lojaRetirada)}</p>
                    </div>
                  ) : null}

                  {modoEntrega === "envio" ? (
                    <>
                      <div>
                        <label htmlFor={`${baseId}-cep`} className="text-sm font-medium text-store-navy">
                          CEP
                        </label>
                        <input
                          id={`${baseId}-cep`}
                          name="cep"
                          autoComplete="postal-code"
                          inputMode="numeric"
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor={`${baseId}-log`} className="text-sm font-medium text-store-navy">
                          Logradouro
                        </label>
                        <input
                          id={`${baseId}-log`}
                          name="logradouro"
                          autoComplete="address-line1"
                          value={logradouro}
                          onChange={(e) =>
                            onEnderecoFieldChange("logradouro", e.target.value, setLogradouro)
                          }
                          className={inputClass}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor={`${baseId}-num`} className="text-sm font-medium text-store-navy">
                          Número
                        </label>
                        <input
                          id={`${baseId}-num`}
                          name="numero"
                          autoComplete="address-line2"
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor={`${baseId}-comp`} className="text-sm font-medium text-store-navy">
                          Complemento{" "}
                          <span className="font-normal text-store-navy-muted">(opcional)</span>
                        </label>
                        <input
                          id={`${baseId}-comp`}
                          name="complemento"
                          autoComplete="off"
                          value={complemento}
                          onChange={(e) => setComplemento(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${baseId}-bairro`} className="text-sm font-medium text-store-navy">
                          Bairro
                        </label>
                        <input
                          id={`${baseId}-bairro`}
                          name="bairro"
                          autoComplete="address-level3"
                          value={bairro}
                          onChange={(e) =>
                            onEnderecoFieldChange("bairro", e.target.value, setBairro)
                          }
                          className={inputClass}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor={`${baseId}-cidade`} className="text-sm font-medium text-store-navy">
                          Cidade
                        </label>
                        <input
                          id={`${baseId}-cidade`}
                          name="cidade"
                          autoComplete="address-level2"
                          value={cidade}
                          onChange={(e) =>
                            onEnderecoFieldChange("cidade", e.target.value, setCidade)
                          }
                          className={inputClass}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor={`${baseId}-uf`} className="text-sm font-medium text-store-navy">
                          UF
                        </label>
                        <input
                          id={`${baseId}-uf`}
                          name="uf"
                          autoComplete="address-level1"
                          maxLength={2}
                          value={uf}
                          onChange={(e) =>
                            onEnderecoFieldChange("uf", e.target.value.toUpperCase(), setUf)
                          }
                          className={inputClass}
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label
                          htmlFor={`${baseId}-doc`}
                          className="text-sm font-medium text-store-navy"
                        >
                          CPF ou CNPJ do destinatário
                        </label>
                        <input
                          id={`${baseId}-doc`}
                          name="destinatario_documento"
                          inputMode="numeric"
                          autoComplete="off"
                          value={destinatarioDocumento}
                          onChange={(e) => setDestinatarioDocumento(e.target.value)}
                          className={inputClass}
                          placeholder="Obrigatório para entrega (somente números)"
                          required
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </section>

              <section
                className="rounded-sm border border-store-line/80 bg-white p-5 shadow-sm sm:p-6"
                aria-labelledby={`${baseId}-pagamento`}
              >
                <h2 id={`${baseId}-pagamento`} className="text-lg font-bold text-black">
                  Forma de pagamento
                </h2>
                <p className="mt-1 text-sm text-store-navy-muted">
                  O desconto cadastrado no produto (PIX ou cartão) será aplicado no total do pedido ao gerar o
                  pagamento no Mercado Pago.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-store-line bg-store-subtle/40 px-4 py-3 text-sm font-medium text-store-navy has-[:checked]:border-store-navy has-[:checked]:bg-white">
                    <input
                      type="radio"
                      name="forma_pagamento"
                      value="cartao"
                      checked={formaPagamento === "cartao"}
                      onChange={() => setFormaPagamento("cartao")}
                      className="h-4 w-4 border-store-line text-store-navy focus:ring-store-navy"
                    />
                    Cartão / parcelado (Mercado Pago)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-store-line bg-store-subtle/40 px-4 py-3 text-sm font-medium text-store-navy has-[:checked]:border-store-navy has-[:checked]:bg-white">
                    <input
                      type="radio"
                      name="forma_pagamento"
                      value="pix"
                      checked={formaPagamento === "pix"}
                      onChange={() => setFormaPagamento("pix")}
                      className="h-4 w-4 border-store-line text-store-navy focus:ring-store-navy"
                    />
                    PIX (aplica desconto de PIX, se houver)
                  </label>
                </div>
              </section>

              <section
                className="rounded-sm border border-store-line/80 bg-white p-5 shadow-sm sm:p-6"
                aria-labelledby={`${baseId}-cupom`}
              >
                <h2 id={`${baseId}-cupom`} className="text-lg font-bold text-black">
                  Cupom de desconto
                </h2>
                <p className="mt-1 text-sm text-store-navy-muted">
                  Opcional. O desconto soma ao que já existe no produto (PIX/cartão) e é validado ao pagar.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`${baseId}-cupom-input`} className="text-sm font-medium text-store-navy">
                      Código
                    </label>
                    <input
                      id={`${baseId}-cupom-input`}
                      name="cupom_codigo"
                      type="text"
                      autoComplete="off"
                      value={cupomInput}
                      onChange={(e) => setCupomInput(e.target.value.toUpperCase())}
                      placeholder="Ex.: ACCORSI10"
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void onAplicarCupom()}
                    disabled={cupomBusy || !hasItems}
                    className="shrink-0 rounded-sm border border-store-line bg-white px-4 py-2.5 text-sm font-semibold text-store-navy transition hover:bg-store-subtle disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cupomBusy ? "Validando…" : "Aplicar"}
                  </button>
                </div>
                {cupomMensagem ? (
                  <p
                    className={`mt-3 text-sm ${cupomDesconto != null ? "text-emerald-800" : "text-red-700"}`}
                    role="status"
                  >
                    {cupomMensagem}
                  </p>
                ) : null}
              </section>

              <section
                className="rounded-sm border border-store-line/80 bg-white p-5 shadow-sm sm:p-6"
                aria-labelledby={`${baseId}-itens`}
              >
                <h2 id={`${baseId}-itens`} className="text-lg font-bold text-black">
                  Itens ({itemCount})
                </h2>
                <ul className="mt-4 divide-y divide-store-line/60">
                  {lines.map((line) => (
                    <li key={line.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-black">{line.titulo}</p>
                        <p className="mt-1 text-xs text-store-navy-muted">Qtd: {line.quantity}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums text-black">
                        {money.format(
                          unitPriceAfterPaymentDiscount(
                            line.valor,
                            formaPagamento,
                            line.desconto_pix_percent,
                            line.desconto_cartao_percent,
                          ) * line.quantity,
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {modoEntrega === "envio" ? (
                <section
                  className="rounded-sm border border-store-line/80 bg-white p-5 shadow-sm sm:p-6"
                  aria-labelledby={`${baseId}-frete`}
                >
                  <h2 id={`${baseId}-frete`} className="text-lg font-bold text-black">
                    Frete
                  </h2>
                  {frete.loading ? (
                    <p className="mt-2 text-sm text-store-navy-muted">Calculando opcoes de frete...</p>
                  ) : frete.error ? (
                    <p className="mt-2 text-sm text-red-700" role="alert">
                      {frete.error}
                    </p>
                  ) : frete.opcoes.length > 0 ? (
                    <fieldset className="mt-4 space-y-2">
                      <legend className="text-sm font-medium text-store-navy">
                        Escolha uma opcao para continuar
                      </legend>
                      {frete.opcoes.map((opcao) => (
                        <label
                          key={opcao.id}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-sm border border-store-line/70 bg-store-subtle/20 px-3 py-2 has-[:checked]:border-store-navy has-[:checked]:bg-white"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="checkout-frete"
                              checked={frete.selectedId === opcao.id}
                              onChange={() => frete.setSelectedId(opcao.id)}
                              className="h-4 w-4 border-store-line text-store-navy"
                            />
                            <span className="text-sm text-store-navy">
                              {opcao.nome}
                              {typeof opcao.prazoDiasUteis === "number"
                                ? ` (${opcao.prazoDiasUteis} dias uteis)`
                                : ""}
                            </span>
                          </span>
                          <strong className="text-sm text-black">
                            {money.format(opcao.precoCentavos / 100)}
                          </strong>
                        </label>
                      ))}
                    </fieldset>
                  ) : (
                    <p className="mt-2 text-sm text-store-navy-muted">
                      Nenhuma opcao de frete disponivel para os dados informados.
                    </p>
                  )}
                </section>
              ) : null}
            </div>

            <aside
              className="rounded-sm border border-store-line/80 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6"
              aria-labelledby={`${baseId}-resumo`}
            >
              <h2 id={`${baseId}-resumo`} className="text-lg font-bold text-black">
                Resumo
              </h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-store-navy">Subtotal</dt>
                  <dd className="font-semibold tabular-nums text-black">{money.format(subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-store-navy">Frete</dt>
                  <dd className="font-semibold tabular-nums text-black">
                    {modoEntrega === "retirada" ? "Retirada na loja" : money.format(shipping)}
                  </dd>
                </div>
                {cupomDesconto != null && cupomDesconto > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-store-navy">Cupom</dt>
                    <dd className="font-semibold tabular-nums text-emerald-800">
                      − {money.format(cupomDesconto)}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="my-5 h-px bg-store-accent" aria-hidden />
              <div className="flex items-end justify-between gap-4">
                <span className="text-base font-bold text-black">Total</span>
                <span className="text-xl font-bold tabular-nums text-black sm:text-2xl">
                  {money.format(total)}
                </span>
              </div>
              <button
                type="submit"
                disabled={
                  checkoutBusy ||
                  (!exigeRetiradaLoja && modoEntrega === "envio" && !frete.selectedOption) ||
                  ((exigeRetiradaLoja || modoEntrega === "retirada") && !lojaRetirada)
                }
                className="mt-6 w-full rounded-sm bg-store-accent py-3.5 text-center text-sm font-bold text-black shadow-sm transition enabled:hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {checkoutBusy ? "Redirecionando…" : "Ir para pagamento"}
              </button>
              <p className="mt-3 text-center text-xs text-store-navy-muted">
                Você será encaminhado ao Mercado Pago para concluir o pagamento com segurança.
              </p>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}
