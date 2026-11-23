/**
 * Casa marca/modelo vindos da consulta de placa com o catálogo (modelos FIPE, uma linha por versão).
 * Funções puras — usadas no client (PlateVehicleFinder) e no servidor (/api/garagem).
 */

type MarcaLike = { id: string; nome: string };
type ModeloLike = { id: string; nome: string; marca_id: string };

export function normalizeVehicleText(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const BRAND_SYNONYMS: Record<string, string[]> = {
  volkswagen: ["vw", "volks", "volks wagen", "vw volkswagen"],
  chevrolet: ["gm", "chevy", "gm chevrolet"],
  mercedes: ["mercedes benz", "mercedes-benz", "mb", "m benz"],
  mitsubishi: ["mit"],
  landrover: ["land rover"],
  citroen: ["citroën"],
  peugeot: ["peugeot-citroen", "psa"],
  bmw: ["b.m.w"],
};

export function canonicalizeBrandName(raw: string | null | undefined): string {
  const base = normalizeVehicleText(raw).replace(/\s+/g, "");
  if (!base) return "";
  for (const [canonical, aliases] of Object.entries(BRAND_SYNONYMS)) {
    if (base === canonical) return canonical;
    if (aliases.some((alias) => normalizeVehicleText(alias).replace(/\s+/g, "") === base)) return canonical;
  }
  return base;
}

/** Semelhança entre a marca do catálogo e a da API (0 = nada a ver). */
export function brandScore(nomeMarcaCatalogo: string | undefined, marcaApiCanonical: string): number {
  const nomeMarca = canonicalizeBrandName(nomeMarcaCatalogo);
  if (!marcaApiCanonical || !nomeMarca) return 0;
  if (nomeMarca === marcaApiCanonical) return 4;
  if (nomeMarca.includes(marcaApiCanonical) || marcaApiCanonical.includes(nomeMarca)) return 2;
  return 0;
}

/** Máximo de marcas candidatas cujos modelos são carregados para comparar com a placa. */
export const MAX_MARCAS_CANDIDATAS = 3;

export function rankMarcasCandidatas<M extends MarcaLike>(marcas: M[], marcaRaw: string | null | undefined): M[] {
  const marcaApi = canonicalizeBrandName(marcaRaw);
  return marcas
    .map((m) => ({ m, score: brandScore(m.nome, marcaApi) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MARCAS_CANDIDATAS)
    .map((x) => x.m);
}

/** Remove prefixo de marca que algumas APIs colocam no modelo ("VW/GOL 1.0" → "gol 1 0"). */
function stripBrandPrefix(modeloNorm: string, marcaRaw: string | null | undefined): string {
  const tokens = modeloNorm.split(" ");
  const marcaTokens = new Set(normalizeVehicleText(marcaRaw).split(" ").filter(Boolean));
  const aliases = new Set<string>();
  const canonical = canonicalizeBrandName(marcaRaw);
  if (canonical) {
    aliases.add(canonical);
    for (const a of BRAND_SYNONYMS[canonical] ?? []) aliases.add(normalizeVehicleText(a).replace(/\s+/g, ""));
  }
  while (tokens.length > 1 && (marcaTokens.has(tokens[0]) || aliases.has(tokens[0]))) tokens.shift();
  return tokens.join(" ");
}

export type ModeloMatch<T> = { modelo: T; score: number; exact: boolean };

/**
 * Ordena modelos do catálogo pela semelhança com o modelo da API.
 * O primeiro token (nome base: "gol", "onix", "hr") é obrigatório — sem ele não há match.
 */
export function rankModelos<T extends ModeloLike>(
  modelos: T[],
  marcaNameById: Map<string, string>,
  modeloRaw: string | null | undefined,
  marcaRaw: string | null | undefined
): ModeloMatch<T>[] {
  const modeloApi = stripBrandPrefix(normalizeVehicleText(modeloRaw), marcaRaw);
  if (!modeloApi) return [];
  const marcaApi = canonicalizeBrandName(marcaRaw);
  const apiTokens = modeloApi.split(" ");
  const apiTokenSet = new Set(apiTokens);

  const out: ModeloMatch<T>[] = [];
  for (const modelo of modelos) {
    const nomeModelo = normalizeVehicleText(modelo.nome);
    if (!nomeModelo) continue;
    const tokens = nomeModelo.split(" ");
    if (tokens[0] !== apiTokens[0]) continue;

    let score: number;
    const exact = nomeModelo === modeloApi;
    if (exact) score = 100;
    else {
      // Quantos tokens da API aparecem no nome do catálogo (e vice-versa), penalizando sobras.
      const catalogSet = new Set(tokens);
      let comuns = 0;
      for (const t of apiTokenSet) if (catalogSet.has(t)) comuns += 1;
      const cobertura = comuns / apiTokenSet.size;
      const precisao = comuns / catalogSet.size;
      score = 10 + cobertura * 30 + precisao * 10;
      if (` ${nomeModelo} `.includes(` ${modeloApi} `)) score += 15;
    }
    score += brandScore(marcaNameById.get(modelo.marca_id), marcaApi);
    out.push({ modelo, score, exact });
  }
  return out.sort((a, b) => b.score - a.score);
}
