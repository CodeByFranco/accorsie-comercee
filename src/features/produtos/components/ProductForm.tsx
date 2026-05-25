"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
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
import { createProduct, type CreateProductState } from "@/features/produtos/services/createProduct";

export type { ModeloOption };
export type { CategoriaOption };
export type { ProdutoRelacionadoOption };

const fieldClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

const initialState: CreateProductState | null = null;

type ProductFormInitialValues = {
  titulo?: string;
  cod_produto?: string;
  descricao?: string;
  valor?: number;
  quantidade_estoque?: number;
  desconto_pix_percent?: number;
  desconto_cartao_percent?: number;
  foto?: string;
  fotos?: Array<{ foto: string; is_principal: boolean; ordem: number }>;
  em_destaque?: boolean;
  somente_retirada_loja?: boolean;
  categoria_ids?: string[];
  compat_rows?: Array<{ modelo_id: string; ano_inicio: string; ano_fim: string }>;
  compat_todos_modelos?: boolean;
  relacionado_ids?: string[];
  prod_comprimento_cm?: number | null;
  prod_largura_cm?: number | null;
  prod_altura_cm?: number | null;
  prod_peso_kg?: number | null;
  embalagem_id?: string | null;
};

function numOrEmpty(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "";
  return String(n);
}

export function ProductForm({
  modelos,
  categorias,
  embalagens,
  produtosRelacionadosOpcoes,
  initialValues,
}: {
  modelos: ModeloOption[];
  categorias: CategoriaOption[];
  embalagens: EmbalagemOption[];
  produtosRelacionadosOpcoes: ProdutoRelacionadoOption[];
  initialValues?: ProductFormInitialValues;
}) {
  const [state, formAction, pending] = useActionState(createProduct, initialState);
  const [activeTab, setActiveTab] = useState<"geral" | "dimensoes" | "embalagem">("geral");
  const [clientError, setClientError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const requiredDimensionFields = [
      { name: "prod_comprimento_cm", label: "comprimento" },
      { name: "prod_largura_cm", label: "largura" },
      { name: "prod_altura_cm", label: "altura" },
      { name: "prod_peso_kg", label: "peso" },
    ] as const;
    const invalidOrEmpty = requiredDimensionFields.filter(({ name }) => {
      const input = form.elements.namedItem(name) as HTMLInputElement | null;
      const raw = input?.value?.trim() ?? "";
      if (!raw) return true;
      const n = Number.parseFloat(raw.replace(",", "."));
      return !Number.isFinite(n) || n < 0;
    });

    if (invalidOrEmpty.length > 0) {
      event.preventDefault();
      setActiveTab("dimensoes");
      setClientError(
        `Preencha as dimensões obrigatórias antes de salvar (${invalidOrEmpty
          .map((field) => field.label)
          .join(", ")}).`
      );
      return;
    }

    setClientError(null);
  }

  if (state?.ok) {
    return (
      <div
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-6 shadow-sm"
        role="status"
      >
        <p className="text-lg font-semibold text-emerald-900">Cadastro concluído</p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-800/95">{state.message}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/admin/produtos"
            className="inline-flex items-center justify-center rounded-lg bg-admin-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1857d1]"
          >
            Ir para produtos
          </Link>
          <a
            href="/admin/produtos/novo"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cadastrar outro produto
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {(clientError || (state && !state.ok)) && (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm"
          role="alert"
        >
          <p className="font-semibold text-red-900">Não foi possível cadastrar</p>
          <p className="mt-1 text-sm leading-relaxed text-red-800/95">{clientError ?? state?.message}</p>
          <Link
            href="/admin"
            className="mt-4 inline-flex text-sm font-semibold text-admin-accent hover:underline"
          >
            Voltar ao painel
          </Link>
        </div>
      )}

      <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <ProductFormTabsLayout
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab === "dimensoes") setClientError(null);
          }}
          geral={
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="titulo" className="text-sm font-medium text-gray-700">
                  Título
                </label>
                <input
                  id="titulo"
                  name="titulo"
                  required
                  className={fieldClass}
                  placeholder="Ex.: Pastilha de freio dianteira"
                  defaultValue={initialValues?.titulo ?? ""}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cod_produto" className="text-sm font-medium text-gray-700">
                  Código do produto
                </label>
                <input
                  id="cod_produto"
                  name="cod_produto"
                  required
                  className={fieldClass}
                  placeholder="Ex.: ACC-001"
                  defaultValue={initialValues?.cod_produto ?? ""}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="descricao" className="text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <ProductDescriptionEditor initialHtml={initialValues?.descricao ?? ""} />
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
                      required
                      className={fieldClass}
                      placeholder="0.00"
                      defaultValue={initialValues?.valor ?? ""}
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
                      required
                      defaultValue={initialValues?.quantidade_estoque ?? 0}
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
                      defaultValue={initialValues?.desconto_pix_percent ?? 0}
                      className={fieldClass}
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500">Aplicado no checkout ao escolher pagamento via PIX.</p>
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
                      defaultValue={initialValues?.desconto_cartao_percent ?? 0}
                      className={fieldClass}
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500">Opcional; em geral fica em 0.</p>
                  </div>
                </div>

              <ProductPhotoPanel
                initialFoto={initialValues?.foto ?? ""}
                initialFotos={initialValues?.fotos ?? []}
              />

              <ProductDestaqueField defaultChecked={Boolean(initialValues?.em_destaque)} />

              <ProductSomenteRetiradaField
                defaultChecked={Boolean(initialValues?.somente_retirada_loja)}
              />

              <ProductCategoriasFieldset
                categorias={categorias}
                selectedIds={initialValues?.categoria_ids ?? []}
              />

              <ProductCompatibilidadeFieldset
                modelos={modelos}
                initialRows={initialValues?.compat_rows ?? []}
                initialAllModelos={Boolean(initialValues?.compat_todos_modelos)}
              />

              <ProductRelacionadosFieldset
                produtos={produtosRelacionadosOpcoes}
                defaultSelectedIds={initialValues?.relacionado_ids ?? []}
              />
            </>
          }
          dimensoes={
            <ProductDimensoesFieldset
              defaultComprimento={numOrEmpty(initialValues?.prod_comprimento_cm)}
              defaultLargura={numOrEmpty(initialValues?.prod_largura_cm)}
              defaultAltura={numOrEmpty(initialValues?.prod_altura_cm)}
              defaultPeso={numOrEmpty(initialValues?.prod_peso_kg)}
            />
          }
          embalagem={
            <ProductEmbalagemFieldset
              embalagens={embalagens}
              defaultEmbalagemId={initialValues?.embalagem_id ?? ""}
            />
          }
        />

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-admin-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1857d1] disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Cadastrar produto"}
        </button>
      </form>
    </>
  );
}
