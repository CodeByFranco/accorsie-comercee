"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { VehicleFilterAnosByModelo, VehicleFilterModelo } from "@/features/compatibilidade/services/getVehicleFilterCatalogData";
import { getModeloAnos } from "@/features/compatibilidade/services/getModeloAnos";
import { useModelosPorMarca } from "@/features/compatibilidade/hooks/useModelosPorMarca";
import type { StoreMarcaOption } from "@/features/marcas/services/getStoreMarcas";
import {
  buildCatalogQueryString,
  parseCatalogSearchParamsFromUrlSearchParams,
} from "@/features/produtos/utils/catalogSearchParams";
import type { CatalogFilters } from "@/features/produtos/utils/catalogSearchParams";
import type { CategoryListItem } from "@/types/category";

type ProductCatalogFiltersProps = {
  categorias: CategoryListItem[];
  marcas: StoreMarcaOption[];
  sliderMax: number;
  modelosVeiculo: VehicleFilterModelo[];
  anosByModeloId: VehicleFilterAnosByModelo;
};

function IconFunnel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5h16l-6 7v6l-4 2v-8L4 5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProductCatalogFilters({
  categorias,
  marcas,
  sliderMax,
  modelosVeiculo,
  anosByModeloId,
}: ProductCatalogFiltersProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const idBase = useId();
  const categoriasPanelId = `${idBase}-categorias`;
  const marcasPanelId = `${idBase}-marcas`;
  const veiculoPanelId = `${idBase}-veiculo`;
  const [localMin, setLocalMin] = useState(0);
  const [localMax, setLocalMax] = useState(sliderMax);
  const [categoriaOpen, setCategoriaOpen] = useState(true);
  const [marcaOpen, setMarcaOpen] = useState(true);
  const [veiculoOpen, setVeiculoOpen] = useState(true);
  const [vehicleMarcaId, setVehicleMarcaId] = useState("");
  const [anosCache, setAnosCache] = useState<VehicleFilterAnosByModelo>(() => anosByModeloId);
  const anosRequestedRef = useRef<Set<string>>(new Set(Object.keys(anosByModeloId)));
  const { porMarca, loadingMarcaIds, carregarMarca, findModelo } = useModelosPorMarca(modelosVeiculo);

  useEffect(() => {
    const f = parseCatalogSearchParamsFromUrlSearchParams(sp);
    setLocalMin(f.precoMin != null && f.precoMin > 0 ? f.precoMin : 0);
    setLocalMax(f.precoMax != null && f.precoMax < sliderMax ? f.precoMax : sliderMax);
    if (f.modeloId) {
      const modeloAtual = modelosVeiculo.find((m) => m.id === f.modeloId);
      setVehicleMarcaId(modeloAtual?.marca_id ?? "");
    } else {
      setVehicleMarcaId("");
    }
  }, [sp, sliderMax, modelosVeiculo]);

  useEffect(() => {
    if (vehicleMarcaId) void carregarMarca(vehicleMarcaId);
  }, [vehicleMarcaId, carregarMarca]);

  useEffect(() => {
    setAnosCache((prev) => ({ ...anosByModeloId, ...prev }));
    for (const id of Object.keys(anosByModeloId)) {
      anosRequestedRef.current.add(id);
    }
  }, [anosByModeloId]);

  const f = parseCatalogSearchParamsFromUrlSearchParams(sp);

  useEffect(() => {
    const id = f.modeloId?.trim() ?? "";
    if (!id || anosRequestedRef.current.has(id)) return;
    anosRequestedRef.current.add(id);
    let cancelled = false;
    void getModeloAnos(id).then((anos) => {
      if (cancelled) {
        anosRequestedRef.current.delete(id);
        return;
      }
      setAnosCache((prev) => ({ ...prev, [id]: anos }));
    });
    return () => {
      cancelled = true;
    };
  }, [f.modeloId]);

  const replaceFilters = (next: CatalogFilters) => {
    const qs = buildCatalogQueryString(next, sliderMax);
    router.replace(`/produtos${qs}`, { scroll: false });
  };

  const toggleCategoria = (id: string) => {
    const f = parseCatalogSearchParamsFromUrlSearchParams(sp);
    const set = new Set(f.categoriaIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    replaceFilters({ ...f, categoriaIds: [...set] });
  };

  const toggleMarca = (id: string) => {
    const f = parseCatalogSearchParamsFromUrlSearchParams(sp);
    const set = new Set(f.marcaIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    replaceFilters({ ...f, marcaIds: [...set] });
  };

  const aplicarPreco = () => {
    const f = parseCatalogSearchParamsFromUrlSearchParams(sp);
    replaceFilters({ ...f, precoMin: localMin, precoMax: localMax });
  };

  const limpar = () => {
    router.replace("/produtos", { scroll: false });
  };

  const limparVeiculo = () => {
    const cur = parseCatalogSearchParamsFromUrlSearchParams(sp);
    replaceFilters({ ...cur, modeloId: null, ano: null });
  };

  const modelosVeiculoFiltrados = useMemo(
    () =>
      vehicleMarcaId
        ? (porMarca[vehicleMarcaId] ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        : [],
    [porMarca, vehicleMarcaId]
  );
  const modeloPlaceholder = !vehicleMarcaId
    ? "Escolha a marca"
    : loadingMarcaIds.has(vehicleMarcaId)
      ? "Carregando…"
      : "Selecione";
  const anosModeloSelecionado = f.modeloId ? anosCache[f.modeloId] ?? [] : [];
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const checkClass =
    "flex cursor-pointer items-start gap-2.5 rounded-md py-1.5 text-sm text-store-navy hover:bg-store-subtle/80";

  return (
    <div className="rounded-sm border border-store-line/80 bg-white p-5 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-store-navy">
        <IconFunnel className="h-5 w-5 shrink-0 text-store-accent" />
        Filtros
      </h2>

      <div className="flex flex-col gap-8">
        <fieldset className="min-w-0">
          <legend className="w-full p-0">
            <button
              type="button"
              className="mb-3 flex w-full items-center justify-between gap-2 rounded-md py-1 text-left transition hover:bg-store-subtle/60"
              aria-expanded={veiculoOpen}
              aria-controls={veiculoPanelId}
              onClick={() => setVeiculoOpen((o) => !o)}
            >
              <span className="text-xs font-bold uppercase tracking-wide text-store-navy-muted">Veículo</span>
              <IconChevronDown
                className={[
                  "h-4 w-4 shrink-0 text-store-navy-muted transition-transform duration-200",
                  veiculoOpen ? "rotate-0" : "-rotate-90",
                ].join(" ")}
              />
            </button>
          </legend>
          {veiculoOpen ? (
            <div id={veiculoPanelId} className="space-y-2 text-sm text-store-navy">
              <label className="block text-xs font-semibold text-store-navy-muted">
                Marca
                <select
                  value={vehicleMarcaId}
                  onChange={(e) => {
                    const nextMarca = e.target.value;
                    setVehicleMarcaId(nextMarca);
                    const currentModel = findModelo(f.modeloId);
                    if (currentModel && currentModel.marca_id !== nextMarca) {
                      replaceFilters({ ...f, modeloId: null, ano: null });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border border-store-line bg-white px-2.5 py-2 text-sm text-store-navy outline-none transition focus:border-store-navy focus:ring-1 focus:ring-store-navy/20"
                >
                  <option value="">Todas</option>
                  {marcas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold text-store-navy-muted">
                Modelo
                <select
                  value={f.modeloId ?? ""}
                  onChange={(e) => {
                    const modeloId = e.target.value || null;
                    replaceFilters({ ...f, modeloId, ano: null });
                  }}
                  disabled={!vehicleMarcaId}
                  className="mt-1 block w-full rounded-md border border-store-line bg-white px-2.5 py-2 text-sm text-store-navy outline-none transition disabled:cursor-not-allowed disabled:bg-store-subtle/60 focus:border-store-navy focus:ring-1 focus:ring-store-navy/20"
                >
                  <option value="">{modeloPlaceholder}</option>
                  {modelosVeiculoFiltrados.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold text-store-navy-muted">
                Ano
                <select
                  value={f.ano != null ? String(f.ano) : ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = raw ? Number.parseInt(raw, 10) : null;
                    const ano = parsed != null && Number.isFinite(parsed) ? parsed : null;
                    replaceFilters({
                      ...f,
                      ano,
                    });
                  }}
                  disabled={!f.modeloId}
                  className="mt-1 block w-full rounded-md border border-store-line bg-white px-2.5 py-2 text-sm text-store-navy outline-none transition disabled:cursor-not-allowed disabled:bg-store-subtle/60 focus:border-store-navy focus:ring-1 focus:ring-store-navy/20"
                >
                  <option value="">Qualquer</option>
                  {anosModeloSelecionado.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={limparVeiculo}
                className="text-xs font-semibold text-store-navy-muted underline decoration-store-line underline-offset-4 hover:text-store-accent"
              >
                Limpar filtro de veículo
              </button>
            </div>
          ) : null}
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="w-full p-0">
            <button
              type="button"
              className="mb-3 flex w-full items-center justify-between gap-2 rounded-md py-1 text-left transition hover:bg-store-subtle/60"
              aria-expanded={categoriaOpen}
              aria-controls={categoriasPanelId}
              onClick={() => setCategoriaOpen((o) => !o)}
            >
              <span className="text-xs font-bold uppercase tracking-wide text-store-navy-muted">Categoria</span>
              <IconChevronDown
                className={[
                  "h-4 w-4 shrink-0 text-store-navy-muted transition-transform duration-200",
                  categoriaOpen ? "rotate-0" : "-rotate-90",
                ].join(" ")}
              />
            </button>
          </legend>
          {categoriaOpen ? (
            <div id={categoriasPanelId}>
              {categorias.length === 0 ? (
                <p className="text-sm text-store-navy-muted">Nenhuma categoria cadastrada.</p>
              ) : (
                <ul className="space-y-0.5">
                  {categorias.map((c) => (
                    <li key={c.id}>
                      <label className={checkClass}>
                        <input
                          type="checkbox"
                          checked={f.categoriaIds.includes(c.id)}
                          onChange={() => toggleCategoria(c.id)}
                          className="mt-0.5 size-4 shrink-0 rounded border-store-line text-store-navy focus:ring-store-navy/30"
                        />
                        <span>{c.nome}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="w-full p-0">
            <button
              type="button"
              className="mb-3 flex w-full items-center justify-between gap-2 rounded-md py-1 text-left transition hover:bg-store-subtle/60"
              aria-expanded={marcaOpen}
              aria-controls={marcasPanelId}
              onClick={() => setMarcaOpen((o) => !o)}
            >
              <span className="text-xs font-bold uppercase tracking-wide text-store-navy-muted">Marca</span>
              <IconChevronDown
                className={[
                  "h-4 w-4 shrink-0 text-store-navy-muted transition-transform duration-200",
                  marcaOpen ? "rotate-0" : "-rotate-90",
                ].join(" ")}
              />
            </button>
          </legend>
          {marcaOpen ? (
            <div id={marcasPanelId}>
              {marcas.length === 0 ? (
                <p className="text-sm text-store-navy-muted">Nenhuma marca cadastrada.</p>
              ) : (
                <ul className="space-y-0.5">
                  {marcas.map((m) => (
                    <li key={m.id}>
                      <label className={checkClass}>
                        <input
                          type="checkbox"
                          checked={f.marcaIds.includes(m.id)}
                          onChange={() => toggleMarca(m.id)}
                          className="mt-0.5 size-4 shrink-0 rounded border-store-line text-store-navy focus:ring-store-navy/30"
                        />
                        <span>{m.nome}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="mb-3 text-xs font-bold uppercase tracking-wide text-store-navy-muted">
            Faixa de preço
          </legend>
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-store-navy">
              <span className="mb-1.5 block text-store-navy-muted">Mínimo</span>
              <input
                type="range"
                min={0}
                max={Math.min(sliderMax, localMax)}
                value={Math.min(localMin, localMax)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLocalMin(Math.min(v, localMax));
                }}
                className="w-full cursor-pointer accent-store-accent"
              />
              <span className="mt-1 block text-sm text-store-navy">{money.format(localMin)}</span>
            </label>
            <label className="block text-xs font-semibold text-store-navy">
              <span className="mb-1.5 block text-store-navy-muted">Máximo</span>
              <input
                type="range"
                min={Math.max(0, localMin)}
                max={sliderMax}
                value={Math.max(localMin, localMax)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLocalMax(Math.max(v, localMin));
                }}
                className="w-full cursor-pointer accent-store-accent"
              />
              <span className="mt-1 block text-sm text-store-navy">{money.format(localMax)}</span>
            </label>
            <div className="flex justify-between text-[0.7rem] font-medium text-store-navy-muted">
              <span>{money.format(0)}</span>
              <span>até {money.format(sliderMax)}</span>
            </div>
            <button
              type="button"
              onClick={aplicarPreco}
              className="w-full rounded-sm bg-store-navy px-3 py-2 text-sm font-bold text-white transition hover:brightness-110"
            >
              Aplicar faixa de preço
            </button>
          </div>
        </fieldset>

        <button
          type="button"
          onClick={limpar}
          className="text-sm font-semibold text-store-navy-muted underline decoration-store-line underline-offset-4 hover:text-store-accent"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  );
}
