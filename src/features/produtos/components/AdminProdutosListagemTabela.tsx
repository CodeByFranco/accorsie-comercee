"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createKitFromProducts } from "@/features/kits/services/kitCollage";
import { ProductDestaqueStarForm } from "@/features/produtos/components/ProductDestaqueStarForm";
import { ProductRowActions } from "@/features/produtos/components/ProductRowActions";
import { ProductStatusBadge } from "@/features/produtos/components/ProductStatusBadge";
import { ReuseProductImageModal } from "@/features/produtos/components/ReuseProductImageModal";
import { deleteProductsEmLote } from "@/features/produtos/services/deleteProduct";
import { resolveProductImagePublicUrl } from "@/features/produtos/utils/resolveProductImagePublicUrl";
import type { ProductStatus } from "@/features/produtos/utils/productStatus";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export type AdminProdutoListItem = {
  id: string;
  titulo: string | null;
  cod_produto: string | null;
  foto: string | null;
  valor: number | null;
  quantidade_estoque: number;
  em_destaque: boolean;
  status: ProductStatus;
};

export function AdminProdutosListagemTabela({ produtos }: { produtos: AdminProdutoListItem[] }) {
  const visibleIds = useMemo(() => produtos.map((p) => p.id), [produtos]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [reuseOpen, setReuseOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkMessageTone, setBulkMessageTone] = useState<"ok" | "warn">("ok");
  const [pending, startTransition] = useTransition();
  const [creatingKit, setCreatingKit] = useState(false);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const selectedInView = useMemo(
    () => visibleIds.filter((id) => selected.has(id)),
    [visibleIds, selected]
  );

  const allSelected = visibleIds.length > 0 && selectedInView.length === visibleIds.length;
  const someSelected = selectedInView.length > 0 && !allSelected;

  useLayoutEffect(() => {
    const el = headerCheckboxRef.current;
    if (!el) return;
    el.indeterminate = someSelected;
  }, [someSelected, allSelected, visibleIds.length]);

  const toggleAll = useCallback(() => {
    setBulkMessage(null);
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(visibleIds));
  }, [allSelected, visibleIds]);

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setBulkMessage(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const destinations = useMemo(
    () =>
      selectedInView.map((id) => {
        const p = produtos.find((row) => row.id === id);
        return {
          id,
          titulo: p?.titulo?.trim() || "Sem título",
        };
      }),
    [selectedInView, produtos]
  );

  const openBulkDeleteConfirm = () => {
    if (selectedInView.length === 0 || pending) return;
    setBulkDeleteConfirmOpen(true);
  };

  const runCreateKit = () => {
    if (selectedInView.length === 0 || pending) return;
    const idsSnapshot = [...selectedInView];
    setBulkMessage(null);
    setCreatingKit(true);
    startTransition(async () => {
      // Em caso de sucesso a action redireciona para a edição do kit.
      const result = await createKitFromProducts(idsSnapshot);
      setCreatingKit(false);
      if (result && !result.ok) {
        setBulkMessageTone("warn");
        setBulkMessage(result.message);
      }
    });
  };

  const runBulkDelete = () => {
    if (selectedInView.length === 0) return;
    const idsSnapshot = [...selectedInView];
    setBulkDeleteConfirmOpen(false);
    setBulkMessage(null);
    startTransition(async () => {
      const { removidos, falhas } = await deleteProductsEmLote(idsSnapshot);
      const failed = new Set(falhas.map((f) => f.id));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of idsSnapshot) {
          if (!failed.has(id)) next.delete(id);
        }
        return next;
      });
      if (removidos === 0 && falhas.length > 0) {
        setBulkMessageTone("warn");
        setBulkMessage(falhas.map((f) => f.message).join(" "));
      } else if (falhas.length > 0) {
        setBulkMessageTone("warn");
        setBulkMessage(
          `${removidos} excluído(s). ${falhas.length} não puderam ser removidos.`
        );
      } else {
        setBulkMessageTone("ok");
        setBulkMessage(
          `${removidos} produto${removidos === 1 ? "" : "s"} excluído${removidos === 1 ? "" : "s"}.`
        );
      }
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            disabled={pending || visibleIds.length === 0}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {allSelected ? "Desmarcar todos" : "Selecionar todos"}
          </button>
          {selectedInView.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setReuseOpen(true)}
                disabled={pending}
                className="rounded-lg border border-[#1857d1] bg-admin-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1857d1] disabled:opacity-50"
              >
                Reutilizar imagem ({selectedInView.length})
              </button>
              <button
                type="button"
                onClick={runCreateKit}
                disabled={pending}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {creatingKit ? "Criando kit…" : `Criar kit com selecionados (${selectedInView.length})`}
              </button>
              <button
                type="button"
                onClick={openBulkDeleteConfirm}
                disabled={pending}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
              >
                Excluir selecionados ({selectedInView.length})
              </button>
            </>
          )}
        </div>
        {selectedInView.length > 0 && (
          <p className="text-[11px] text-gray-500">
            {selectedInView.length} produto{selectedInView.length === 1 ? "" : "s"} selecionado
            {selectedInView.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !pending) setBulkDeleteConfirmOpen(false);
        }}
        title="Excluir produtos?"
        description={
          <p>
            Você vai excluir{" "}
            <strong className="text-gray-800">{selectedInView.length}</strong> produto
            {selectedInView.length === 1 ? "" : "s"}. Itens em kits serão removidos desses kits.{" "}
            <span className="font-medium text-gray-800">Esta ação não pode ser desfeita.</span>
          </p>
        }
        confirmLabel="Sim, excluir"
        pending={pending}
        onConfirm={runBulkDelete}
      />

      {bulkMessage && (
        <p
          className={
            bulkMessageTone === "ok"
              ? "border-b border-emerald-100 bg-emerald-50 px-6 py-2 text-sm text-emerald-950"
              : "border-b border-amber-100 bg-amber-50 px-6 py-2 text-sm text-amber-950"
          }
          role="status"
        >
          {bulkMessage}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="w-[1%] px-3 py-3" scope="col">
                <span className="sr-only">Seleção em massa</span>
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={pending || visibleIds.length === 0}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent"
                  aria-label="Selecionar ou desmarcar todos os produtos da listagem"
                />
              </th>
              <th className="w-14 px-2 py-3 text-center text-amber-500" scope="col">
                <span className="sr-only">Destaque na home</span>
                <span aria-hidden>★</span>
              </th>
              <th className="w-16 px-3 py-3" scope="col">
                <span className="sr-only">Foto</span>
              </th>
              <th className="px-6 py-3">Produto</th>
              <th className="px-6 py-3">Código</th>
              <th className="px-6 py-3 text-right">Valor</th>
              <th className="px-6 py-3 text-right">Estoque</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {produtos.map((p) => {
              const fotoSrc = resolveProductImagePublicUrl(p.foto);
              const estoque = Number(p.quantidade_estoque);
              const checked = selected.has(p.id);
              return (
                <tr key={p.id} className="text-gray-900 transition hover:bg-gray-50/80">
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleOne(p.id, e.target.checked)}
                      disabled={pending}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent"
                      aria-label={`Selecionar ${p.titulo?.trim() || "produto"}`}
                    />
                  </td>
                  <td className="px-2 py-4">
                    <ProductDestaqueStarForm productId={p.id} emDestaque={p.em_destaque} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
                      {fotoSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fotoSrc} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-gray-400">Sem foto</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{p.titulo?.trim() || "Sem título"}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">
                    {p.cod_produto?.trim() || "—"}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums text-gray-800">
                    {p.valor != null && Number.isFinite(Number(p.valor))
                      ? money.format(Number(p.valor))
                      : "—"}
                  </td>
                  <td
                    className={`px-6 py-4 text-right tabular-nums ${
                      estoque <= 0
                        ? "font-semibold text-red-700"
                        : estoque === 1
                          ? "font-semibold text-amber-800"
                          : "text-gray-800"
                    }`}
                  >
                    {estoque}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <ProductStatusBadge status={p.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ProductRowActions productId={p.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ReuseProductImageModal
        open={reuseOpen}
        onOpenChange={setReuseOpen}
        destinations={destinations}
        onSuccess={(message) => {
          setBulkMessageTone("ok");
          setBulkMessage(message);
          setSelected(new Set());
        }}
      />
    </div>
  );
}
