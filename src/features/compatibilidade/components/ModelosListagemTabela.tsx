"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { MarcaOption } from "@/features/compatibilidade/components/ModeloForm";
import { ModeloTableRow } from "@/features/compatibilidade/components/ModeloTableRow";
import { deleteModelosEmLote } from "@/features/compatibilidade/services/modeloActions";

export type ModeloListagemItem = {
  modeloId: string;
  marcaId: string;
  nome: string;
  tipoVeiculo: string | null;
  marcaNome: string;
};

export function ModelosListagemTabela({
  items,
  marcas,
}: {
  items: ModeloListagemItem[];
  marcas: MarcaOption[];
}) {
  const visibleIds = useMemo(() => items.map((i) => i.modeloId), [items]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const selectedInView = useMemo(() => visibleIds.filter((id) => selected.has(id)), [visibleIds, selected]);

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

  const openBulkDeleteConfirm = () => {
    if (selectedInView.length === 0 || pending) return;
    setBulkDeleteConfirmOpen(true);
  };

  const runBulkDelete = () => {
    if (selectedInView.length === 0) return;
    const idsSnapshot = [...selectedInView];
    setBulkDeleteConfirmOpen(false);
    setBulkMessage(null);
    startTransition(async () => {
      const { removidos, falhas } = await deleteModelosEmLote(idsSnapshot);
      const failed = new Set(falhas.map((f) => f.id));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of idsSnapshot) {
          if (!failed.has(id)) next.delete(id);
        }
        return next;
      });
      if (removidos === 0 && falhas.length > 0) {
        setBulkMessage(falhas.map((f) => f.message).join(" "));
      } else if (falhas.length > 0) {
        setBulkMessage(
          `${removidos} removido(s). ${falhas.length} não puderam ser excluídos (ex.: dados vinculados).`
        );
      } else {
        setBulkMessage(`${removidos} modelo(s) removido(s).`);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleAll}
            disabled={pending || visibleIds.length === 0}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {allSelected ? "Desmarcar todos" : "Selecionar todos da listagem"}
          </button>
          <button
            type="button"
            onClick={openBulkDeleteConfirm}
            disabled={pending || selectedInView.length === 0}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
          >
            Apagar selecionados
            {selectedInView.length > 0 ? ` (${selectedInView.length})` : ""}
          </button>
        </div>
        <p className="text-[11px] text-gray-500">
          Reflete só os modelos visíveis após os filtros por marca e nome.
        </p>
      </div>
      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !pending) setBulkDeleteConfirmOpen(false);
        }}
        title="Tem certeza?"
        description={
          <p>
            Você vai excluir <strong className="text-gray-800">{selectedInView.length}</strong> modelo
            {selectedInView.length === 1 ? "" : "s"} visíve
            {selectedInView.length === 1 ? "l" : "is"} nesta listagem (após o filtro por nome). Compatibilidades de
            produtos e anos de referência ligados{" "}
            {selectedInView.length === 1 ? "a ele serão impactados" : "a eles serão impactados"}.{" "}
            <span className="font-medium text-gray-800">Esta ação não pode ser desfeita.</span>
          </p>
        }
        confirmLabel="Sim, excluir"
        pending={pending}
        onConfirm={runBulkDelete}
      />
      {bulkMessage && (
        <p className="px-4 text-xs text-gray-700" role="status">
          {bulkMessage}
        </p>
      )}
      <div className="max-h-[min(55vh,22rem)] overflow-auto">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead className="sticky top-0 z-[1]">
            <tr className="border-b border-gray-100 bg-gray-50/95 text-[10px] font-semibold uppercase tracking-wide text-gray-500 backdrop-blur-sm">
              <th className="w-[1%] px-3 py-2">
                <span className="sr-only">Seleção em massa</span>
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={pending || visibleIds.length === 0}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent"
                  aria-label="Selecionar ou desmarcar todos os modelos da listagem"
                />
              </th>
              <th className="px-4 py-2">Marca</th>
              <th className="px-4 py-2">Modelo</th>
              <th className="whitespace-nowrap px-4 py-2">Tipo</th>
              <th className="min-w-[12rem] px-4 py-2">Anos de referência</th>
              <th className="w-[1%] px-3 py-2 text-right font-semibold normal-case tracking-normal">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((m) => (
              <ModeloTableRow
                key={m.modeloId}
                modeloId={m.modeloId}
                marcaId={m.marcaId}
                nome={m.nome}
                tipoVeiculo={m.tipoVeiculo}
                marcaNome={m.marcaNome}
                marcas={marcas}
                bulkCheckbox={{
                  checked: selected.has(m.modeloId),
                  onChange: (checked) => toggleOne(m.modeloId, checked),
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
