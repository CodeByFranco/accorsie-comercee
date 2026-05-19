"use client";

import { useState } from "react";

import type { CategoriaOption } from "@/features/produtos/components/ProductCategoriasFieldset";
import type { EmbalagemOption } from "@/features/produtos/components/ProductEmbalagemFieldset";
import {
  ProductForm,
  type ModeloOption,
  type ProdutoRelacionadoOption,
} from "@/features/produtos/components/ProductForm";

type ProductCreateModalProps = {
  modelos: ModeloOption[];
  categorias: CategoriaOption[];
  embalagens: EmbalagemOption[];
  produtosRelacionadosOpcoes: ProdutoRelacionadoOption[];
  disabled?: boolean;
};

export function ProductCreateModal({
  modelos,
  categorias,
  embalagens,
  produtosRelacionadosOpcoes,
  disabled = false,
}: ProductCreateModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex items-center justify-center rounded-lg bg-admin-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1857d1] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cadastrar novo produto
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            aria-label="Fechar modal"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-5xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Novo produto</h3>
                <p className="text-sm text-gray-500">Preencha os dados para cadastrar no catálogo.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
              <ProductForm
                modelos={modelos}
                categorias={categorias}
                embalagens={embalagens}
                produtosRelacionadosOpcoes={produtosRelacionadosOpcoes}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
