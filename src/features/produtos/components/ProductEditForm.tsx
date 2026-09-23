"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  ProductCompatibilidadeFieldset,
  type ModeloOption,
} from "@/features/produtos/components/ProductCompatibilidadeFieldset";
import { ProductDimensoesFieldset } from "@/features/produtos/components/ProductDimensoesFieldset";
import {
  ProductEmbalagemFieldset,
  type EmbalagemOption,
} from "@/features/produtos/components/ProductEmbalagemFieldset";
import { ProductFormTabsLayout } from "@/features/produtos/components/ProductFormTabsLayout";
import {
  ProductCategoriasFieldset,
  type CategoriaOption,
} from "@/features/produtos/components/ProductCategoriasFieldset";
import { ProductDestaqueField } from "@/features/produtos/components/ProductDestaqueField";
import { ProductSomenteRetiradaField } from "@/features/produtos/components/ProductSomenteRetiradaField";
import { ProductPhotoPanel } from "@/features/produtos/components/ProductPhotoPanel";
import {
  ProductRelacionadosFieldset,
  type ProdutoRelacionadoOption,
} from "@/features/produtos/components/ProductRelacionadosFieldset";
import { ProductDescriptionEditor } from "@/features/produtos/components/ProductDescriptionEditor";
import { ProductPublishActions } from "@/features/produtos/components/ProductPublishActions";
import { AddMissingModeloAnosButton } from "@/features/produtos/components/AddMissingModeloAnosButton";
import { publishProduct } from "@/features/produtos/services/publishProduct";
import { updateProduct, type UpdateProductState } from "@/features/produtos/services/updateProduct";
import type { ProductStatus } from "@/features/produtos/utils/productStatus";

export type { ModeloOption, CategoriaOption };

export type ProductCompatRow = {
  modelo_id: string;
  ano_inicio: string;
  ano_fim: string;
};

export type ProductEditValues = {
  id: string;
  titulo: string;
  cod_produto: string;
  descricao: string;
  valor: number | null;
  foto: string;
  fotos: Array<{
    foto: string;
    is_principal: boolean;
    ordem: number;
  }>;
  quantidade_estoque: number;
  status: ProductStatus;
  em_destaque: boolean;
  somente_retirada_loja: boolean;
  compat_todos_modelos: boolean;
  categoria_ids: string[];
  compat_rows: ProductCompatRow[];
  prod_comprimento_cm: number | null;
  prod_largura_cm: number | null;
  prod_altura_cm: number | null;
  prod_peso_kg: number | null;
  embalagem_id: string | null;
  desconto_pix_percent: number;
  desconto_cartao_percent: number;
  relacionado_ids: string[];
};

const fieldClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

const initialState: UpdateProductState | null = null;

type AnosFixFlow = "idle" | "saving" | "publishing" | "publish_error";

function numOrEmpty(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "";
  return String(n);
}

export function ProductEditForm({
  product,
  modelos,
  categorias,
  embalagens,
  produtosRelacionadosOpcoes,
}: {
  product: ProductEditValues;
  modelos: ModeloOption[];
  categorias: CategoriaOption[];
  embalagens: EmbalagemOption[];
  produtosRelacionadosOpcoes: ProdutoRelacionadoOption[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateProduct, initialState);
  const fieldsRequired = product.status === "published";
  const formRef = useRef<HTMLFormElement>(null);
  const [anosFixFlow, setAnosFixFlow] = useState<AnosFixFlow>("idle");
  const [publishFlowError, setPublishFlowError] = useState<string | null>(null);
  const publishStartedRef = useRef(false);
  const sawPendingForFixRef = useRef(false);

  const missingModeloAnos =
    state && !state.ok && state.missingModeloAnos?.length ? state.missingModeloAnos : null;

  /** Após corrigir anos: permanece no cadastro (não some o formulário). */
  const keepCadastroVisible =
    anosFixFlow === "saving" ||
    anosFixFlow === "publishing" ||
    anosFixFlow === "publish_error";

  const showForm = !state?.ok || keepCadastroVisible;

  useEffect(() => {
    if (anosFixFlow !== "saving") return;

    if (pending) {
      sawPendingForFixRef.current = true;
      return;
    }

    // Ainda não começou o submit deste fluxo (estado antigo do erro).
    if (!sawPendingForFixRef.current) return;
    if (!state) return;

    if (!state.ok) {
      setAnosFixFlow("idle");
      publishStartedRef.current = false;
      return;
    }

    if (publishStartedRef.current) return;
    publishStartedRef.current = true;

    if (product.status === "published") {
      setAnosFixFlow("idle");
      router.refresh();
      return;
    }

    setAnosFixFlow("publishing");
    setPublishFlowError(null);

    void (async () => {
      const result = await publishProduct(product.id);
      if (!result.ok) {
        setAnosFixFlow("publish_error");
        setPublishFlowError(result.message);
        publishStartedRef.current = false;
        return;
      }
      // Recarrega a mesma tela de cadastro já com status publicado.
      window.location.assign(`/admin/produtos/${product.id}/edit`);
    })();
  }, [anosFixFlow, state, pending, product.id, product.status, router]);

  return (
    <>
      <ProductPublishActions productId={product.id} status={product.status} />

      {(anosFixFlow === "saving" || anosFixFlow === "publishing") && (
        <div
          className="mb-6 rounded-xl border border-admin-accent/30 bg-[#edf3ff] px-5 py-4 shadow-sm"
          role="status"
        >
          <p className="font-semibold text-[#123a8c]">Publicar agora!</p>
          <p className="mt-1 text-sm text-[#1a4bb8]/95">
            {anosFixFlow === "saving"
              ? "Anos cadastrados. Salvando o produto…"
              : "Checando se está tudo certo e publicando o produto…"}
          </p>
        </div>
      )}

      {anosFixFlow === "publish_error" && publishFlowError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm" role="alert">
          <p className="font-semibold text-red-900">Anos cadastrados, mas a publicação falhou</p>
          <p className="mt-1 text-sm text-red-800/95">{publishFlowError}</p>
          <p className="mt-2 text-xs text-red-800/80">
            O produto foi salvo. Corrija o que falta e use o botão «Publicar Produto» acima.
          </p>
        </div>
      )}

      {state?.ok && anosFixFlow === "idle" && (
        <div
          className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm"
          role="status"
        >
          <p className="font-semibold text-emerald-900">Alterações salvas</p>
          <p className="mt-1 text-sm text-emerald-800/95">{state.message}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-lg bg-admin-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1857d1]"
            >
              Ir ao painel
            </Link>
            <a
              href={`/admin/produtos/${product.id}/edit`}
              className="inline-flex items-center justify-center text-sm font-semibold text-admin-accent underline-offset-4 hover:underline"
            >
              Continuar editando
            </a>
          </div>
        </div>
      )}

      {state && !state.ok && anosFixFlow === "idle" && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm" role="alert">
          <p className="font-semibold text-red-900">Algo deu errado</p>
          <p className="mt-1 text-sm text-red-800/95">{state.message}</p>
          {missingModeloAnos ? (
            <AddMissingModeloAnosButton
              missing={missingModeloAnos}
              pendingLabel="Cadastrando anos…"
              onAdded={() => {
                sawPendingForFixRef.current = false;
                publishStartedRef.current = false;
                setPublishFlowError(null);
                setAnosFixFlow("saving");
                formRef.current?.requestSubmit();
              }}
            />
          ) : null}
          <Link
            href="/admin"
            className="mt-3 inline-block text-sm font-semibold text-admin-accent hover:underline"
          >
            Voltar ao painel
          </Link>
        </div>
      )}

      {showForm && Number(product.quantidade_estoque) === 1 ? (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm"
          role="status"
        >
          <p className="font-semibold text-amber-950">Última unidade em estoque</p>
          <p className="mt-1 text-sm text-amber-900/95">
            Este produto tem apenas 1 unidade disponível para venda. Considere repor o estoque em breve.
          </p>
        </div>
      ) : null}

      {showForm ? (
        <form ref={formRef} action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={product.id} />

          <ProductFormTabsLayout
            geral={
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="titulo" className="text-sm font-medium text-gray-700">
                    Título
                  </label>
                  <input
                    id="titulo"
                    name="titulo"
                    required={fieldsRequired}
                    defaultValue={product.titulo}
                    className={fieldClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cod_produto" className="text-sm font-medium text-gray-700">
                    Código do produto
                  </label>
                  <input
                    id="cod_produto"
                    name="cod_produto"
                    required={fieldsRequired}
                    defaultValue={product.cod_produto}
                    className={fieldClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="descricao" className="text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <ProductDescriptionEditor key={`desc-${product.id}`} initialHtml={product.descricao} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="valor" className="text-sm font-medium text-gray-700">
                      Valor (R$)
                    </label>
                    <input
                      id="valor"
                      name="valor"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={0}
                      required={fieldsRequired}
                      defaultValue={product.valor ?? ""}
                      className={fieldClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="quantidade_estoque" className="text-sm font-medium text-gray-700">
                      Quantidade em estoque
                    </label>
                    <input
                      id="quantidade_estoque"
                      name="quantidade_estoque"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      required={fieldsRequired}
                      defaultValue={product.quantidade_estoque}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="desconto_pix_percent" className="text-sm font-medium text-gray-700">
                      Desconto no PIX (%)
                    </label>
                    <input
                      id="desconto_pix_percent"
                      name="desconto_pix_percent"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={0}
                      max={100}
                      defaultValue={product.desconto_pix_percent}
                      className={fieldClass}
                    />
                    <p className="text-xs text-gray-500">Aplicado no checkout ao escolher PIX.</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="desconto_cartao_percent" className="text-sm font-medium text-gray-700">
                      Desconto no cartão (%)
                    </label>
                    <input
                      id="desconto_cartao_percent"
                      name="desconto_cartao_percent"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={0}
                      max={100}
                      defaultValue={product.desconto_cartao_percent}
                      className={fieldClass}
                    />
                    <p className="text-xs text-gray-500">Opcional; em geral 0.</p>
                  </div>
                </div>

                <ProductPhotoPanel initialFoto={product.foto} initialFotos={product.fotos} />

                <ProductDestaqueField key={product.id} defaultChecked={product.em_destaque} />

                <ProductSomenteRetiradaField
                  key={`retirada-${product.id}`}
                  defaultChecked={product.somente_retirada_loja}
                />

                <ProductCategoriasFieldset categorias={categorias} selectedIds={product.categoria_ids} />

                <ProductCompatibilidadeFieldset
                  modelos={modelos}
                  initialRows={product.compat_rows}
                  initialAllModelos={product.compat_todos_modelos}
                  replaceOnSave
                />

                <ProductRelacionadosFieldset
                  key={`rel-${product.id}-${product.relacionado_ids.join(",")}`}
                  produtos={produtosRelacionadosOpcoes}
                  defaultSelectedIds={product.relacionado_ids}
                />
              </>
            }
            dimensoes={
              <ProductDimensoesFieldset
                defaultComprimento={numOrEmpty(product.prod_comprimento_cm)}
                defaultLargura={numOrEmpty(product.prod_largura_cm)}
                defaultAltura={numOrEmpty(product.prod_altura_cm)}
                defaultPeso={numOrEmpty(product.prod_peso_kg)}
                fieldsRequired={fieldsRequired}
              />
            }
            embalagem={
              <ProductEmbalagemFieldset
                key={`${product.id}-${product.embalagem_id ?? "none"}`}
                embalagens={embalagens}
                defaultEmbalagemId={product.embalagem_id ?? ""}
              />
            }
          />

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-admin-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1857d1] disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar alterações"}
          </button>
        </form>
      ) : null}
    </>
  );
}
