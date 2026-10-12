"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

import type { VehicleFilterMarca, VehicleFilterModelo } from "@/features/compatibilidade/services/getVehicleFilterCatalogData";
import { getModeloAnos } from "@/features/compatibilidade/services/getModeloAnos";
import { PLACA_CONSULTA_ANON_LIFETIME_MAX, PLACA_CONSULTA_USER_DAILY_MAX } from "@/lib/placaConsultaQuota";
import { createClient } from "@/services/supabase/client";

type PlateVehicleApiResponse = {
  placa: string;
  modelo: string | null;
  marca: string | null;
  ano: number | null;
  fonte: string;
  informacoesVeiculo?: {
    marca: string | null;
    modelo: string | null;
    ano: number | null;
  };
};

type PlateVehicleFinderProps = {
  marcas: VehicleFilterMarca[];
  /** Busca (com cache) os modelos de uma marca — o catálogo não vem inteiro para o navegador. */
  carregarMarca: (marcaId: string) => Promise<VehicleFilterModelo[]>;
  onResolvedVehicle: (modelo: VehicleFilterModelo, ano: number | null) => void;
  /** `filterToolbar`: faixa ao lado dos filtros (home). `default`: bloco completo acima. */
  variant?: "default" | "filterToolbar";
};

type PendingVehicleMatch = {
  modelo: VehicleFilterModelo;
  modeloId: string;
  modeloNome: string;
  ano: number | null;
  /** Catálogo bate com o texto da API (evita salvar modelo_id errado por match parcial). */
  catalogIdMatchesApi: boolean;
};

type VehicleInfoModalData = {
  marca: string | null;
  modelo: string | null;
  ano: number | null;
};

function normalizeText(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const BRAND_SYNONYMS: Record<string, string[]> = {
  volkswagen: ["vw", "volks", "volks wagen"],
  chevrolet: ["gm", "chevy"],
  mercedes: ["mercedes benz", "mercedes-benz", "mb"],
  mitsubishi: ["mit"],
  landrover: ["land rover"],
  citroen: ["citroën"],
  peugeot: ["peugeot-citroen", "psa"],
  bmw: ["b.m.w"],
};

function canonicalizeBrandName(raw: string | null | undefined): string {
  const base = normalizeText(raw).replace(/\s+/g, "");
  if (!base) return "";
  for (const [canonical, aliases] of Object.entries(BRAND_SYNONYMS)) {
    if (base === canonical) return canonical;
    if (aliases.some((alias) => normalizeText(alias).replace(/\s+/g, "") === base)) return canonical;
  }
  return base;
}

/** Pontuação de semelhança entre o nome da marca do catálogo e o da API (0 = nada a ver). */
function brandScore(nomeMarcaCatalogo: string | undefined, marcaApi: string): number {
  const nomeMarca = canonicalizeBrandName(nomeMarcaCatalogo);
  if (!marcaApi || !nomeMarca) return 0;
  if (nomeMarca === marcaApi) return 4;
  if (nomeMarca.includes(marcaApi) || marcaApi.includes(nomeMarca)) return 2;
  return 0;
}

/** Máximo de marcas candidatas cujos modelos são carregados para comparar com a placa. */
const MAX_MARCAS_CANDIDATAS = 3;

function normalizePlateInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function isValidPlate(plate: string): boolean {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate) || /^[A-Z]{3}[0-9]{4}$/.test(plate);
}

function IconSearchSymbol({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 15l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PlateVehicleFinder({
  marcas,
  carregarMarca,
  onResolvedVehicle,
  variant = "default",
}: PlateVehicleFinderProps) {
  const router = useRouter();
  const placaQuotaDescId = useId();
  const [placa, setPlaca] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingGarage, setSavingGarage] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  const [sessionLoggedIn, setSessionLoggedIn] = useState<boolean | null>(null);
  const [pendingMatch, setPendingMatch] = useState<PendingVehicleMatch | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfoModalData | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setSessionLoggedIn(Boolean(data.user));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionLoggedIn(Boolean(session?.user));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const marcaNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of marcas) map.set(m.id, m.nome);
    return map;
  }, [marcas]);

  const applyFromApi = async () => {
    const placaNormalizada = normalizePlateInput(placa);
    if (!isValidPlate(placaNormalizada)) {
      setPendingMatch(null);
      setFeedback("Digite uma placa válida no formato ABC1234 ou ABC1D23.");
      return;
    }

    setLoading(true);
    setPendingMatch(null);
    setFeedback(null);
    setLastErrorCode(null);

    try {
      const res = await fetch(`/api/veiculos/placa?placa=${encodeURIComponent(placaNormalizada)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const payload = (await res.json()) as PlateVehicleApiResponse | { message?: string; code?: string };
      if (!res.ok) {
        setPendingMatch(null);
        setModalOpen(false);
        setVehicleInfo(null);
        const errPayload = payload as { message?: string; code?: string };
        setLastErrorCode(typeof errPayload.code === "string" ? errPayload.code : null);
        setFeedback(
          typeof errPayload.message === "string"
            ? errPayload.message
            : "Não foi possível consultar esta placa agora."
        );
        return;
      }

      const successPayload = payload as PlateVehicleApiResponse;
      setVehicleInfo({
        marca: successPayload.informacoesVeiculo?.marca ?? successPayload.marca ?? null,
        modelo: successPayload.informacoesVeiculo?.modelo ?? successPayload.modelo ?? null,
        ano: successPayload.informacoesVeiculo?.ano ?? successPayload.ano ?? null,
      });
      setModalOpen(true);

      const modeloRaw = successPayload.informacoesVeiculo?.modelo ?? successPayload.modelo;
      const marcaRaw = successPayload.informacoesVeiculo?.marca ?? successPayload.marca;
      const modeloApi = normalizeText(modeloRaw);
      const marcaApi = canonicalizeBrandName(marcaRaw);
      const anoApi = successPayload.informacoesVeiculo?.ano ?? successPayload.ano ?? null;

      const marcasCandidatas = marcas
        .map((m) => ({ id: m.id, score: brandScore(m.nome, marcaApi) }))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_MARCAS_CANDIDATAS);
      const modelosCandidatos = (
        await Promise.all(marcasCandidatas.map((m) => carregarMarca(m.id)))
      ).flat();

      const candidates = modelosCandidatos
        .map((modelo) => {
          const nomeModelo = normalizeText(modelo.nome);
          let score = 0;

          if (modeloApi && nomeModelo === modeloApi) score += 10;
          else if (modeloApi && (nomeModelo.includes(modeloApi) || modeloApi.includes(nomeModelo))) score += 7;

          score += brandScore(marcaNameById.get(modelo.marca_id), marcaApi);

          return { modelo, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);

      const winner = candidates[0]?.modelo;
      if (!winner) {
        setPendingMatch(null);
        setFeedback("Encontramos a placa, mas não achamos um modelo compatível no seu catálogo.");
        return;
      }

      const nomeWinnerNorm = normalizeText(winner.nome);
      const marcaWinnerNorm = canonicalizeBrandName(marcaNameById.get(winner.marca_id));
      const exactModelo = Boolean(modeloApi && nomeWinnerNorm === modeloApi);
      const exactMarca = Boolean(marcaApi && marcaWinnerNorm === marcaApi);
      const catalogIdMatchesApi = exactModelo && (!marcaApi || exactMarca);

      let anoAplicado: number | null = null;
      if (anoApi != null) {
        const anos = await getModeloAnos(winner.id);
        if (anos.includes(anoApi)) anoAplicado = anoApi;
      }

      setPendingMatch({
        modelo: winner,
        modeloId: winner.id,
        modeloNome: winner.nome,
        ano: anoAplicado,
        catalogIdMatchesApi,
      });
      const nomeExibicao =
        successPayload.informacoesVeiculo?.modelo ?? successPayload.modelo ?? winner.nome;
      setFeedback(
        `Veículo identificado: ${nomeExibicao}${anoAplicado ? ` (${anoAplicado})` : ""}. Deseja aplicar esse filtro?`
      );
    } catch {
      setPendingMatch(null);
      setModalOpen(false);
      setVehicleInfo(null);
      setFeedback("Falha de comunicação ao consultar a placa.");
    } finally {
      setLoading(false);
    }
  };

  const onApplyFilter = () => {
    if (!pendingMatch) {
      setModalOpen(false);
      router.push("/produtos");
      setFeedback("Veículo consultado. Você pode refinar os filtros no catálogo de produtos.");
      return;
    }
    onResolvedVehicle(pendingMatch.modelo, pendingMatch.ano);
    setModalOpen(false);
    setFeedback(
      pendingMatch.catalogIdMatchesApi
        ? `Filtro aplicado: ${pendingMatch.modeloNome}${pendingMatch.ano ? ` (${pendingMatch.ano})` : ""}.`
        : `Filtro pelo catálogo: ${pendingMatch.modeloNome}${pendingMatch.ano ? ` (${pendingMatch.ano})` : ""}. Confira se combina com seu carro.`
    );
    setPendingMatch(null);
  };

  const onSaveGarage = async () => {
    const placaNormalizada = normalizePlateInput(placa);
    if (!isValidPlate(placaNormalizada)) {
      setFeedback("Digite uma placa válida para salvar na garagem.");
      return;
    }
    setSavingGarage(true);
    try {
      const response = await fetch("/api/garagem", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          placa: placaNormalizada,
          marca: vehicleInfo?.marca ?? null,
          modelo: vehicleInfo?.modelo ?? pendingMatch?.modeloNome ?? null,
          ano: vehicleInfo?.ano ?? pendingMatch?.ano ?? null,
          modeloId: pendingMatch?.catalogIdMatchesApi ? pendingMatch.modeloId : null,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (response.status === 401) {
        router.push("/login?next=%2Fconta%3Faba%3Dgaragem");
        return;
      }
      if (!response.ok) {
        setFeedback(payload.message ?? "Não foi possível salvar esse veículo na sua garagem.");
        return;
      }
      setFeedback("Veículo adicionado à sua garagem.");
      setModalOpen(false);
    } catch {
      setFeedback("Falha de comunicação ao salvar na garagem.");
    } finally {
      setSavingGarage(false);
    }
  };

  const quotaSrLabel =
    sessionLoggedIn
      ? `Limite: até ${PLACA_CONSULTA_USER_DAILY_MAX} consultas por placa por dia (Brasília).`
      : `Limite: sem login até ${PLACA_CONSULTA_ANON_LIFETIME_MAX} consulta neste dispositivo.`;

  const toolbarBody = (
    <>
      {variant === "filterToolbar" ? (
        <div className="flex min-h-0 w-full flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:py-0 md:gap-3">
          <p id={placaQuotaDescId} className="sr-only">
            {quotaSrLabel}
          </p>
          <div className="my-0.5 mx-1 flex w-full min-w-0 flex-1 items-center justify-center text-center sm:mx-2 sm:my-0 sm:mr-3 sm:w-auto sm:justify-end sm:text-right md:mx-2.5">
            <p className="m-0 w-full text-[11px] font-bold leading-snug text-white sm:text-xs sm:leading-snug md:text-sm">
              Digite a sua placa aqui e encontre peças compatíveis
            </p>
          </div>
          <div
            className="mx-auto hidden h-9 w-px shrink-0 self-center bg-store-accent sm:mx-0 sm:block"
            aria-hidden
          />
          <div className="flex w-full shrink-0 flex-row items-center justify-center gap-1.5 sm:w-auto sm:max-w-[10rem] sm:justify-start">
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={8}
              value={placa}
              onChange={(e) => setPlaca(normalizePlateInput(e.target.value))}
              placeholder="ABC1D23"
              aria-describedby={placaQuotaDescId}
              className="h-9 w-[7.25rem] shrink-0 rounded-full border border-white/25 bg-white px-2.5 text-[11px] font-semibold tracking-[0.06em] text-store-navy outline-none transition placeholder:text-store-navy/45 focus:border-store-accent/90 focus:ring-1 focus:ring-store-accent/30 sm:w-[7.5rem] sm:text-xs"
            />
            <button
              type="button"
              disabled={loading}
              onClick={applyFromApi}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-store-accent text-store-navy shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              aria-label={loading ? "Consultando placa" : "Buscar placa"}
              title={loading ? "Consultando…" : "Buscar placa"}
            >
              {loading ? (
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-store-navy border-t-transparent"
                  aria-hidden
                />
              ) : (
                <IconSearchSymbol className="h-[1.05rem] w-[1.05rem]" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
          <div className="w-full">
            <p className="text-base font-extrabold leading-tight sm:text-lg">Digite sua placa e encontre peças compatíveis</p>
            <p className="mt-2 max-w-sm text-[11px] leading-snug text-white/80">
              {sessionLoggedIn
                ? `Você pode fazer até ${PLACA_CONSULTA_USER_DAILY_MAX} consultas por placa por dia (horário de Brasília).`
                : `Sem login: até ${PLACA_CONSULTA_ANON_LIFETIME_MAX} consulta neste dispositivo. Com conta: até ${PLACA_CONSULTA_USER_DAILY_MAX} por dia.`}
            </p>
            <div className="mt-3 flex flex-col items-center gap-1.5 sm:flex-row sm:justify-center sm:gap-2">
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={8}
                value={placa}
                onChange={(e) => setPlaca(normalizePlateInput(e.target.value))}
                placeholder="ABC1D23"
                className="h-8 w-full max-w-[7.5rem] rounded-md border border-white/20 bg-white/90 px-2 text-[11px] font-semibold tracking-[0.06em] text-store-navy outline-none ring-0 transition placeholder:text-store-navy/45 focus:border-store-accent/80 focus:bg-white sm:max-w-[8rem]"
              />
              <button
                type="button"
                disabled={loading}
                onClick={applyFromApi}
                className="h-8 rounded-md bg-store-accent px-2.5 text-[11px] font-extrabold text-store-navy transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Consultando..." : "Buscar placa"}
              </button>
            </div>
          </div>
        </div>
      )}
      {feedback ? (
        <div
          className={
            variant === "filterToolbar"
              ? "mt-2 flex flex-col gap-1 text-left sm:mt-3"
              : "mt-2 flex flex-col items-center gap-1"
          }
        >
          <p className="text-xs text-white/90">{feedback}</p>
          {lastErrorCode === "PLACA_QUOTA_ANON" ? (
            <Link
              href="/login"
              className="text-xs font-bold text-store-accent underline decoration-store-accent/80 underline-offset-2 hover:brightness-110"
            >
              Fazer login ou criar conta
            </Link>
          ) : null}
        </div>
      ) : null}
      {pendingMatch ? (
        <div className="mt-2 rounded-xl border border-white/35 bg-white/10 px-3 py-2 sm:mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Veiculo identificado</p>
          <p className="mt-1 text-sm font-extrabold text-white">
            Modelo: {vehicleInfo?.modelo ?? pendingMatch.modeloNome}
            {(vehicleInfo?.ano ?? pendingMatch.ano)
              ? ` - Ano: ${vehicleInfo?.ano ?? pendingMatch.ano}`
              : " - Ano: nao informado"}
          </p>
        </div>
      ) : null}
    </>
  );

  return (
    <section
      className={
        variant === "filterToolbar"
          ? "flex min-h-0 w-full flex-1 flex-col rounded-2xl bg-[#304375] px-3 py-2 text-white shadow-md sm:px-4 sm:py-2 sm:pb-2.5 lg:min-h-0 lg:flex-1 lg:py-2 lg:pl-4 lg:pr-4"
          : "mb-5 rounded-2xl bg-[#304375] p-4 text-white shadow-lg sm:p-5"
      }
    >
      {variant === "filterToolbar" ? (
        <div className="flex min-h-0 w-full flex-1 flex-col justify-center">{toolbarBody}</div>
      ) : (
        toolbarBody
      )}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-store-line bg-white p-4 text-store-navy shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-black sm:text-lg">Informações do veículo</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-store-line px-2 py-1 text-xs font-bold text-store-navy"
              >
                Fechar
              </button>
            </div>
            {vehicleInfo ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-store-line/70 bg-store-subtle px-2.5 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-store-navy-muted">Marca</p>
                  <p className="mt-0.5 text-sm font-semibold text-store-navy">{vehicleInfo.marca ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-store-line/70 bg-store-subtle px-2.5 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-store-navy-muted">Modelo</p>
                  <p className="mt-0.5 text-sm font-semibold text-store-navy">{vehicleInfo.modelo ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-store-line/70 bg-store-subtle px-2.5 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-store-navy-muted">Ano</p>
                  <p className="mt-0.5 text-sm font-semibold text-store-navy">{vehicleInfo.ano ?? "-"}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-store-navy-muted">
                A consulta retornou poucos detalhes, mas a placa foi processada com sucesso.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onApplyFilter}
                className="h-10 rounded-lg bg-store-navy px-3 text-xs font-extrabold text-white transition hover:bg-store-navy/90"
              >
                Buscar produtos
              </button>
              <button
                type="button"
                onClick={() => {
                  void onSaveGarage();
                }}
                disabled={savingGarage}
                className="h-10 rounded-lg border border-store-navy px-3 text-xs font-bold text-store-navy transition hover:bg-store-subtle disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingGarage ? "Salvando..." : "Adicionar meu veículo à minha garagem"}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-10 rounded-lg border border-store-line px-3 text-xs font-bold text-store-navy transition hover:bg-store-subtle"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
