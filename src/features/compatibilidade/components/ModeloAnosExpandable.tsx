"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ModeloAnosCell } from "@/features/compatibilidade/components/ModeloAnosCell";
import type { ModeloAnosResumo } from "@/features/compatibilidade/services/fetchAllModeloAnosPaginated";
import {
  getModeloAnosRefs,
  type ModeloAnoRef,
} from "@/features/compatibilidade/services/modeloActions";

function formatResumo(resumo: ModeloAnosResumo | undefined): string {
  if (!resumo) return "Clique para ver ou editar os anos";
  if (resumo.count === 0) return "Nenhum ano cadastrado";
  if (resumo.count === 1) return `${resumo.anoMin} (1 ano)`;
  if (resumo.anoMin === resumo.anoMax) return `${resumo.anoMin} (${resumo.count} anos)`;
  return `${resumo.anoMin}–${resumo.anoMax} (${resumo.count} anos)`;
}

function resumoFromAnos(anos: ModeloAnoRef[]): ModeloAnosResumo | undefined {
  if (anos.length === 0) return undefined;
  let anoMin = anos[0]!.ano;
  let anoMax = anos[0]!.ano;
  for (const row of anos) {
    if (row.ano < anoMin) anoMin = row.ano;
    if (row.ano > anoMax) anoMax = row.ano;
  }
  return { count: anos.length, anoMin, anoMax };
}

export function ModeloAnosExpandable({
  modeloId,
  resumo: resumoInicial,
  modeloAnosError,
}: {
  modeloId: string;
  resumo?: ModeloAnosResumo;
  modeloAnosError: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [resumo, setResumo] = useState(resumoInicial);
  const [anos, setAnos] = useState<ModeloAnoRef[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setResumo(resumoInicial);
  }, [resumoInicial]);

  const reloadAnos = useCallback(() => {
    startTransition(async () => {
      setLoadError(null);
      const result = await getModeloAnosRefs(modeloId);
      if (result.ok === false) {
        setLoadError(result.message);
        return;
      }
      setAnos(result.anos);
      setResumo(resumoFromAnos(result.anos));
    });
  }, [modeloId]);

  const openExpand = () => {
    setExpanded(true);
    if (anos !== null) return;
    reloadAnos();
  };

  const collapse = () => {
    setExpanded(false);
    setLoadError(null);
  };

  if (modeloAnosError) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  if (expanded) {
    return (
      <div className="space-y-2">
        {pending && anos === null && (
          <p className="text-xs text-gray-500" role="status">
            Carregando anos…
          </p>
        )}
        {loadError && (
          <p className="text-xs text-red-700" role="alert">
            {loadError}
          </p>
        )}
        {anos !== null && !loadError && (
          <ModeloAnosCell modeloId={modeloId} anos={anos} onAnosMutated={reloadAnos} />
        )}
        <button
          type="button"
          onClick={collapse}
          disabled={pending}
          className="text-[11px] font-medium text-admin-accent hover:underline disabled:opacity-50"
        >
          Recolher anos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-700">{formatResumo(resumo)}</p>
      <button
        type="button"
        onClick={openExpand}
        className="text-[11px] font-semibold text-admin-accent hover:underline"
      >
        Gerenciar anos
      </button>
    </div>
  );
}
