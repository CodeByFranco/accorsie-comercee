"use client";

import { useActionState } from "react";
import {
  TIPO_VEICULO_MODELO_LABELS,
  TIPOS_VEICULO_MODELO,
} from "@/features/compatibilidade/constants/tipoVeiculoModelo";
import { createModelo, type CreateModeloState } from "@/features/compatibilidade/services/modeloActions";

export type MarcaOption = {
  id: string;
  nome: string;
};

const fieldClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

const initialState: CreateModeloState = null;

export function ModeloForm({ marcas }: { marcas: MarcaOption[] }) {
  const [state, formAction, pending] = useActionState(createModelo, initialState);

  return (
    <>
      {state && !state.ok && (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm"
          role="alert"
        >
          <p className="font-semibold text-red-900">Não foi possível cadastrar</p>
          <p className="mt-1 text-sm leading-relaxed text-red-800/95">{state.message}</p>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="marca_id" className="text-sm font-medium text-gray-700">
            Marca
          </label>
          <select
            id="marca_id"
            name="marca_id"
            required
            className={fieldClass}
            defaultValue=""
          >
            <option value="" disabled>
              Selecione a marca
            </option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="nome" className="text-sm font-medium text-gray-700">
            Nome do modelo
          </label>
          <input
            id="nome"
            name="nome"
            required
            className={fieldClass}
            placeholder="Ex.: Civic, Gol 1.0, Corolla XEi"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipo_veiculo" className="text-sm font-medium text-gray-700">
            Tipo de veículo
          </label>
          <select id="tipo_veiculo" name="tipo_veiculo" required className={fieldClass} defaultValue="carro">
            {TIPOS_VEICULO_MODELO.map((t) => (
              <option key={t} value={t}>
                {TIPO_VEICULO_MODELO_LABELS[t]}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Define se este modelo é de carro, caminhão ou camionete (picape / SUV).
          </p>
        </div>

        <button
          type="submit"
          disabled={pending || marcas.length === 0}
          className="rounded-lg bg-admin-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1857d1] disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Cadastrar modelo"}
        </button>
      </form>
    </>
  );
}
