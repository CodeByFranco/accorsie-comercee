"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { MelhorEnvioQuoteOption } from "@/services/melhorEnvio/types";

export type FreteItemInput = {
  produto_id: string;
  quantidade: number;
};

type FreteQuoteState = {
  loading: boolean;
  error: string | null;
  opcoes: MelhorEnvioQuoteOption[];
  selectedId: string | null;
};

type FreteQuoteResponse = {
  opcoes?: MelhorEnvioQuoteOption[];
  error?: string;
};

function onlyCepDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

const SELECTED_KEY = "accorsi:frete-opcao";

function lerOpcaoPreferida(): string | null {
  try {
    return window.sessionStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

function salvarOpcaoPreferida(id: string): void {
  try {
    window.sessionStorage.setItem(SELECTED_KEY, id);
  } catch {
    /* sem storage: segue sem lembrar */
  }
}

function pickCheapest(opcoes: MelhorEnvioQuoteOption[]): string | null {
  if (opcoes.length === 0) return null;
  return [...opcoes].sort((a, b) => a.precoCentavos - b.precoCentavos)[0]?.id ?? null;
}

export function useFreteQuote(items: FreteItemInput[], cep: string, enabled: boolean = true) {
  const [state, setState] = useState<FreteQuoteState>({
    loading: false,
    error: null,
    opcoes: [],
    selectedId: null,
  });
  const normalizedCep = useMemo(() => onlyCepDigits(cep), [cep]);

  const clear = useCallback((error: string | null = null) => {
    setState({
      loading: false,
      error,
      opcoes: [],
      selectedId: null,
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() =>
        setState({ loading: false, error: null, opcoes: [], selectedId: null }),
      );
      return;
    }
    if (items.length === 0) {
      queueMicrotask(() => clear(null));
      return;
    }
    if (normalizedCep.length !== 8) {
      queueMicrotask(() => clear("Informe um CEP valido para calcular o frete."));
      return;
    }

    const ac = new AbortController();
    queueMicrotask(() => setState((prev) => ({ ...prev, loading: true, error: null })));

    void fetch("/api/frete/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ac.signal,
      body: JSON.stringify({
        cep_destino: normalizedCep,
        itens: items,
      }),
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as FreteQuoteResponse;
        if (!res.ok) {
          throw new Error(json.error || "Nao foi possivel calcular o frete.");
        }
        return json;
      })
      .then((json) => {
        const opcoes = Array.isArray(json.opcoes) ? json.opcoes : [];
        const cheapest = pickCheapest(opcoes);
        setState((prev) => {
          const keepCurrent = prev.selectedId && opcoes.some((o) => o.id === prev.selectedId);
          const preferida = lerOpcaoPreferida();
          const usarPreferida = preferida && opcoes.some((o) => o.id === preferida);
          return {
            loading: false,
          error: opcoes.length > 0 ? null : "Nenhuma opcao de frete disponivel para este CEP.",
            opcoes,
            selectedId: keepCurrent ? prev.selectedId : usarPreferida ? preferida : cheapest,
          };
        });
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : "Falha ao calcular frete.",
          opcoes: [],
          selectedId: null,
        });
      });

    return () => ac.abort();
  }, [items, normalizedCep, clear, enabled]);

  const selectedOption = useMemo(
    () => state.opcoes.find((op) => op.id === state.selectedId) ?? null,
    [state.opcoes, state.selectedId],
  );

  const setSelectedId = useCallback((id: string) => {
    salvarOpcaoPreferida(id);
    setState((prev) => ({ ...prev, selectedId: id }));
  }, []);

  return {
    loading: state.loading,
    error: state.error,
    opcoes: state.opcoes,
    selectedId: state.selectedId,
    selectedOption,
    freteValue: selectedOption ? selectedOption.precoCentavos / 100 : 0,
    setSelectedId,
  };
}
