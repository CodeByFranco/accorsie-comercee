"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteModelo,
  updateModelo,
} from "@/features/compatibilidade/services/modeloActions";
import { ModeloAnosCell } from "@/features/compatibilidade/components/ModeloAnosCell";
import type { MarcaOption } from "@/features/compatibilidade/components/ModeloForm";
import {
  TIPO_VEICULO_MODELO_LABELS,
  TIPOS_VEICULO_MODELO,
  normalizeTipoVeiculoModeloFromDb,
  type TipoVeiculoModelo,
} from "@/features/compatibilidade/constants/tipoVeiculoModelo";

const fieldClass =
  "w-full min-w-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition disabled:opacity-50";

export function ModeloTableRow({
  modeloId,
  marcaId,
  nome,
  tipoVeiculo,
  marcaNome,
  anos,
  modeloAnosError,
  marcas,
  bulkCheckbox,
}: {
  modeloId: string;
  marcaId: string;
  nome: string;
  tipoVeiculo: string | null;
  marcaNome: string;
  anos: { id: string; ano: number }[];
  modeloAnosError: boolean;
  marcas: MarcaOption[];
  bulkCheckbox?: { checked: boolean; onChange: (checked: boolean) => void };
}) {
  const [editing, setEditing] = useState(false);
  const [editMarcaId, setEditMarcaId] = useState(marcaId);
  const [editNome, setEditNome] = useState(nome);
  const [editTipo, setEditTipo] = useState<TipoVeiculoModelo>(() =>
    normalizeTipoVeiculoModeloFromDb(tipoVeiculo)
  );
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function resetDraftFromProps() {
    setEditMarcaId(marcaId);
    setEditNome(nome);
    setEditTipo(normalizeTipoVeiculoModeloFromDb(tipoVeiculo));
  }

  function cancelEdit() {
    resetDraftFromProps();
    setEditing(false);
    setError(null);
  }

  function beginEdit() {
    setError(null);
    resetDraftFromProps();
    setEditing(true);
  }

  function handleSave() {
    setError(null);
    const fd = new FormData();
    fd.set("modelo_id", modeloId);
    fd.set("marca_id", editMarcaId.trim());
    fd.set("nome", editNome.trim());
    fd.set("tipo_veiculo", editTipo);
    startTransition(async () => {
      const r = await updateModelo(fd);
      if (r.ok === false) {
        setError(r.message);
        return;
      }
      setEditing(false);
    });
  }

  function runDelete() {
    setDeleteOpen(false);
    setError(null);
    startTransition(async () => {
      const r = await deleteModelo(modeloId);
      if (r.ok === false) {
        setError(r.message);
      }
    });
  }

  const tipoLabel = TIPO_VEICULO_MODELO_LABELS[normalizeTipoVeiculoModeloFromDb(tipoVeiculo)];

  return (
    <>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir modelo?"
        description={
          <>
            Excluir o modelo <strong className="text-gray-800">“{nome}”</strong> ({marcaNome})? As
            compatibilidades de produtos com este modelo e os anos de referência serão removidos.{" "}
            <span className="font-medium text-gray-800">Esta ação não pode ser desfeita.</span>
          </>
        }
        confirmLabel="Sim, excluir"
        onConfirm={runDelete}
      />
      <tr className="align-top text-gray-900 transition hover:bg-gray-50/80">
        {bulkCheckbox && (
          <td className="w-[1%] px-3 py-2 align-middle">
            <input
              type="checkbox"
              checked={bulkCheckbox.checked}
              onChange={(e) => bulkCheckbox.onChange(e.target.checked)}
              disabled={pending}
              className="h-3.5 w-3.5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent"
              aria-label={`Selecionar modelo ${nome}`}
            />
          </td>
        )}
        <td className="max-w-[10rem] px-4 py-2">
          {editing ? (
            <select
              value={editMarcaId}
              onChange={(e) => setEditMarcaId(e.target.value)}
              className={fieldClass}
              disabled={pending}
              aria-label="Marca do modelo"
            >
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          ) : (
            marcaNome
          )}
        </td>
        <td className="px-4 py-2 font-medium">
          {editing ? (
            <input
              type="text"
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              className={fieldClass}
              disabled={pending}
              aria-label="Nome do modelo"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
                if (e.key === "Escape") cancelEdit();
              }}
            />
          ) : (
            nome
          )}
          {error && (
            <p className="mt-1 text-xs font-normal text-red-600" role="alert">
              {error}
            </p>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-2">
          {editing ? (
            <select
              value={editTipo}
              onChange={(e) => setEditTipo(e.target.value as TipoVeiculoModelo)}
              className={fieldClass}
              disabled={pending}
              aria-label="Tipo de veículo"
            >
              {TIPOS_VEICULO_MODELO.map((t) => (
                <option key={t} value={t}>
                  {TIPO_VEICULO_MODELO_LABELS[t]}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-gray-700">{tipoLabel}</span>
          )}
        </td>
        <td className="px-4 py-2">
          {!modeloAnosError ? (
            <ModeloAnosCell modeloId={modeloId} anos={anos} />
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
        <td className="w-[1%] whitespace-nowrap px-3 py-2">
          <div className="flex justify-end gap-0.5">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={pending}
                  className={`${iconBtn} text-emerald-700 hover:bg-emerald-50`}
                  aria-label="Salvar modelo"
                  title="Salvar"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={pending}
                  className={`${iconBtn} text-gray-600 hover:bg-gray-100`}
                  aria-label="Cancelar edição"
                  title="Cancelar"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={beginEdit}
                  disabled={pending}
                  className={`${iconBtn} text-admin-accent hover:bg-[#1d63ed]/10`}
                  aria-label="Editar modelo"
                  title="Editar"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  disabled={pending}
                  className={`${iconBtn} text-red-600 hover:bg-red-50`}
                  aria-label="Excluir modelo"
                  title="Excluir"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    </>
  );
}
