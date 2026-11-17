"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  PARCELAMENTO_FAIXAS_PADRAO,
  type ParcelamentoFaixa,
} from "@/features/produtos/utils/parcelamento";

const ParcelamentoFaixasContext = createContext<ParcelamentoFaixa[]>(PARCELAMENTO_FAIXAS_PADRAO);

export function ParcelamentoFaixasProvider({
  faixas,
  children,
}: {
  faixas: ParcelamentoFaixa[];
  children: ReactNode;
}) {
  return <ParcelamentoFaixasContext.Provider value={faixas}>{children}</ParcelamentoFaixasContext.Provider>;
}

export function useParcelamentoFaixas(): ParcelamentoFaixa[] {
  return useContext(ParcelamentoFaixasContext);
}
