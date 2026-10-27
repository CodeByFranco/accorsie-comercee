"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createEmbalagem, deleteEmbalagem } from "@/features/produtos/services/embalagemActions";

export type EmbalagemOption = {
  id: string;
  nome: string;
  comprimento_cm: number;
  largura_cm: number;
  altura_cm: number;
  peso_embalagem_kg: number;
};

const fieldClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

const nf = (n: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(n);

export function ProductEmbalagemFieldset({
  embalagens,
  defaultEmbalagemId = "",
}: {
  embalagens: EmbalagemOption[];
  defaultEmbalagemId?: string | null;
}) {
  const router = useRouter();
  const [tabEmbalagemId, setTabEmbalagemId] = useState(defaultEmbalagemId ?? "");
  const [prodPesoKg, setProdPesoKg] = useState(0);
  const [createState, createAction, createPending] = useActionState(createEmbalagem, null);
  const [deletePending, startDelete] = useTransition();
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState({
    nome: "",
    comprimento_cm: "",
    largura_cm: "",
    altura_cm: "",
    peso_embalagem_kg: "",
  });

  const byId = useMemo(() => new Map(embalagens.map((e) => [e.id, e])), [embalagens]);
  const selected = tabEmbalagemId ? byId.get(tabEmbalagemId) : undefined;

  useEffect(() => {
    const el = document.getElementById("prod_peso_kg") as HTMLInputElement | null;
    if (!el) return;
    const read = () => {
      const raw = el.value.trim();
      const n = raw ? Number.parseFloat(raw.replace(",", ".")) : 0;
      setProdPesoKg(Number.isFinite(n) ? n : 0);
    };
    read();
    el.addEventListener("input", read);
    return () => el.removeEventListener("input", read);
  }, []);

  useEffect(() => {
    if (createState?.ok) {
      setCreateDraft({ nome: "", comprimento_cm: "", largura_cm: "", altura_cm: "", peso_embalagem_kg: "" });
      router.refresh();
    }
  }, [createState?.ok, router]);

  const pesoTotal =
    selected != null ? Number(selected.peso_embalagem_kg) + prodPesoKg : null;

  function submitCreate() {
    const fd = new FormData();
    fd.set("nome", createDraft.nome);
    fd.set("comprimento_cm", createDraft.comprimento_cm);
    fd.set("largura_cm", createDraft.largura_cm);
    fd.set("altura_cm", createDraft.altura_cm);
    fd.set("peso_embalagem_kg", createDraft.peso_embalagem_kg);
    createAction(fd);
  }

  function runDeleteEmbalagem() {
    const id = deleteId;
    if (!id) return;
    setDeleteId(null);
    const fd = new FormData();
    fd.set("id", id);
    startDelete(async () => {
      setDeleteErr(null);
      const r = await deleteEmbalagem(fd);
      if (!r.ok) {
        setDeleteErr(r.message);
        return;
      }
      if (tabEmbalagemId === id) setTabEmbalagemId("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleteId(null);
        }}
        title="Remover embalagem?"
        description="Remover esta embalagem do catálogo? Produtos que a usavam ficarão sem embalagem."
        confirmLabel="Sim, remover"
        pending={deletePending}
        onConfirm={runDeleteEmbalagem}
      />
      <fieldset className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 md:p-5">
        <legend className="text-sm font-semibold text-gray-900">Embalagens fixas (catálogo)</legend>
        <p className="text-xs leading-relaxed text-gray-600">
          Cadastre caixas ou envelopes reutilizáveis. Depois, escolha qual embalagem este produto utiliza no envio:
          as medidas de envio vêm da embalagem; o peso total soma o peso da caixa com o peso do produto (aba
          Dimensões).
        </p>

        {deleteErr && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900" role="alert">
            {deleteErr}
          </p>
        )}

        {createState && !createState.ok && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900" role="alert">
            {createState.message}
          </p>
        )}
        {createState?.ok && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            {createState.message}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="nova_embalagem_nome" className="text-sm font-medium text-gray-700">
              Nome da embalagem
            </label>
            <input
              id="nova_embalagem_nome"
              value={createDraft.nome}
              onChange={(e) => setCreateDraft((d) => ({ ...d, nome: e.target.value }))}
              className={fieldClass}
              placeholder="Ex.: Caixa P — 20×15×10"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Comprimento (cm)</label>
            <input
              value={createDraft.comprimento_cm}
              onChange={(e) => setCreateDraft((d) => ({ ...d, comprimento_cm: e.target.value }))}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Largura (cm)</label>
            <input
              value={createDraft.largura_cm}
              onChange={(e) => setCreateDraft((d) => ({ ...d, largura_cm: e.target.value }))}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Altura (cm)</label>
            <input
              value={createDraft.altura_cm}
              onChange={(e) => setCreateDraft((d) => ({ ...d, altura_cm: e.target.value }))}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Peso da embalagem vazia (kg)</label>
            <input
              value={createDraft.peso_embalagem_kg}
              onChange={(e) => setCreateDraft((d) => ({ ...d, peso_embalagem_kg: e.target.value }))}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.001"
              className={fieldClass}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={submitCreate}
          disabled={createPending}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-60"
        >
          {createPending ? "Salvando…" : "Salvar embalagem no catálogo"}
        </button>

        {embalagens.length > 0 && (
          <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white text-sm">
            {embalagens.map((e) => (
              <li
                key={e.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{e.nome}</p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {nf(e.comprimento_cm)} × {nf(e.largura_cm)} × {nf(e.altura_cm)} cm · {nf(e.peso_embalagem_kg)}{" "}
                    kg (caixa)
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deletePending}
                  onClick={() => setDeleteId(e.id)}
                  className="shrink-0 rounded-md text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 md:p-5">
        <legend className="text-sm font-semibold text-gray-900">Embalagem deste produto</legend>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="embalagem_id" className="text-sm font-medium text-gray-700">
            Usar embalagem
          </label>
          <select
            id="embalagem_id"
            name="embalagem_id"
            value={tabEmbalagemId}
            onChange={(e) => setTabEmbalagemId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Nenhuma (somente dimensões do produto)</option>
            {embalagens.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>

        {selected ? (
          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-950">
            <p className="font-medium">Medidas de envio (preenchidas pela embalagem)</p>
            <p className="mt-2 text-xs leading-relaxed text-emerald-900/90">
              Comprimento {nf(selected.comprimento_cm)} cm · Largura {nf(selected.largura_cm)} cm · Altura{" "}
              {nf(selected.altura_cm)} cm
            </p>
            <p className="mt-3 text-xs leading-relaxed text-emerald-900/90">
              Peso da caixa: {nf(selected.peso_embalagem_kg)} kg + peso do produto ({nf(prodPesoKg)} kg, aba
              Dimensões) ={" "}
              <span className="font-semibold">{pesoTotal != null ? `${nf(pesoTotal)} kg` : "—"}</span> (total
              estimado)
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-600">
            Selecione uma embalagem cadastrada para preencher automaticamente as dimensões de envio. O peso total
            usa o peso da caixa mais o campo &quot;Peso do produto&quot; na aba Dimensões.
          </p>
        )}
      </fieldset>
    </div>
  );
}
