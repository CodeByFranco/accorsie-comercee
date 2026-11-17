const ANO_ATUAL = new Date().getFullYear();
const ANO_CURRENT_END = ANO_ATUAL + 1;

/** chave no título -> { modelo: regex no nome do modelo, marca: regex no nome da marca } */
export const VEICULOS = [
  { titulo: /\bGol\b/i, modelo: /^gol\b(?! ?(1000|gti|tsi))/i, marca: /volks|vw/i },
  { titulo: /\bVoyage\b/i, modelo: /^voyage\b/i, marca: /volks|vw/i },
  { titulo: /\bSaveiro\b/i, modelo: /^saveiro\b/i, marca: /volks|vw/i },
  { titulo: /\bCross ?fox\b/i, modelo: /^cross ?fox\b/i, marca: /volks|vw/i },
  { titulo: /\bSpace ?fox\b/i, modelo: /^space ?fox\b/i, marca: /volks|vw/i },
  { titulo: /(?<!cross ?|space ?)\bFox\b/i, modelo: /^fox\b/i, marca: /volks|vw/i },
  { titulo: /\bPolo\b/i, modelo: /^polo\b/i, marca: /volks|vw/i },
  { titulo: /\bVirtus\b/i, modelo: /^virtus\b/i, marca: /volks|vw/i },
  { titulo: /\bT-?Cross\b/i, modelo: /^t-?cross\b/i, marca: /volks|vw/i },
  { titulo: /\bNivus\b/i, modelo: /^nivus\b/i, marca: /volks|vw/i },
  { titulo: /\bOnix\b/i, modelo: /^onix\b/i, marca: /chevrolet|gm/i },
  { titulo: /\bPrisma\b/i, modelo: /^prisma\b/i, marca: /chevrolet|gm/i },
  { titulo: /\bSonic\b/i, modelo: /^sonic\b/i, marca: /chevrolet|gm/i },
  { titulo: /\bSpin\b/i, modelo: /^spin\b/i, marca: /chevrolet|gm/i },
  { titulo: /\bCobalt\b/i, modelo: /^cobalt\b/i, marca: /chevrolet|gm/i },
  { titulo: /\bCelta\b/i, modelo: /^celta\b/i, marca: /chevrolet|gm/i },
  { titulo: /\bCorsa Classic\b/i, modelo: /^(corsa sed\.? ?clas|classic)/i, marca: /chevrolet|gm/i },
  { titulo: /\bCorsa\b(?! Classic)/i, modelo: /^corsa\b(?! sed\.? ?clas)/i, marca: /chevrolet|gm/i },
  { titulo: /\bAgile\b/i, modelo: /^agile\b/i, marca: /chevrolet|gm/i },
  { titulo: /\bMontana\b/i, modelo: /^montana\b/i, marca: /chevrolet|gm/i },
  { titulo: /\bPalio\b/i, modelo: /^palio\b/i, marca: /fiat/i },
  { titulo: /\bGrand Siena\b/i, modelo: /^grand siena\b/i, marca: /fiat/i },
  { titulo: /(?<!grand )\bSiena\b/i, modelo: /^siena\b/i, marca: /fiat/i },
  { titulo: /\bStrada\b/i, modelo: /^strada\b/i, marca: /fiat/i },
  { titulo: /\bIdea\b/i, modelo: /^idea\b/i, marca: /fiat/i },
  { titulo: /\bDobl[oó]\b/i, modelo: /^dobl[oó]\b/i, marca: /fiat/i },
  { titulo: /\bUno\b/i, modelo: /^uno\b/i, marca: /fiat/i },
  { titulo: /\bFiorino\b/i, modelo: /^fiorino\b/i, marca: /fiat/i },
  { titulo: /\bElba\b/i, modelo: /^elba\b/i, marca: /fiat/i },
  { titulo: /\bMobi\b/i, modelo: /^mobi\b/i, marca: /fiat/i },
  { titulo: /\bCronos\b/i, modelo: /^cronos\b/i, marca: /fiat/i },
  { titulo: /\bPunto\b/i, modelo: /^punto\b/i, marca: /fiat/i },
  { titulo: /\bLinea\b/i, modelo: /^linea\b/i, marca: /fiat/i },
  { titulo: /\bArgo\b/i, modelo: /^argo\b/i, marca: /fiat/i },
  { titulo: /\bPulse\b/i, modelo: /^pulse\b/i, marca: /fiat/i },
  { titulo: /\bToro\b/i, modelo: /^toro\b/i, marca: /fiat/i },
  { titulo: /\bKa\b/i, modelo: /^(new )?ka\b/i, marca: /ford/i },
  { titulo: /\bCourier\b/i, modelo: /^courier\b/i, marca: /ford/i },
  { titulo: /\bFiesta\b/i, modelo: /^(new )?fiesta\b/i, marca: /ford/i },
  { titulo: /\bFocus\b/i, modelo: /^(new )?focus\b/i, marca: /ford/i },
  { titulo: /\bEco ?sport\b/i, modelo: /^(new )?eco ?sport\b/i, marca: /ford/i },
  { titulo: /\bHB20/i, modelo: /^hb ?20/i, marca: /hyundai/i },
  { titulo: /\bCorolla\b/i, modelo: /^corolla\b(?! cross)/i, marca: /toyota/i },
  { titulo: /\bFi?l?der\b/i, modelo: /^fielder\b/i, marca: /toyota/i },
  { titulo: /\bEtios\b/i, modelo: /^etios\b/i, marca: /toyota/i },
  { titulo: /\bCivic\b/i, modelo: /^(new )?civic\b/i, marca: /honda/i },
  { titulo: /\bFit\b/i, modelo: /^fit\b/i, marca: /honda/i },
  { titulo: /\bCit[y]?\b/i, modelo: /^city\b/i, marca: /honda/i },
  { titulo: /\bLogan\b/i, modelo: /^logan\b/i, marca: /renault/i },
  { titulo: /\bSandero\b/i, modelo: /^sandero\b/i, marca: /renault/i },
  { titulo: /\bDuster\b/i, modelo: /^duster\b(?! oroch)/i, marca: /renault/i },
  { titulo: /\bCaptur\b/i, modelo: /^captur\b/i, marca: /renault/i },
  { titulo: /\bRenegade\b/i, modelo: /^renegade\b/i, marca: /jeep/i },
  { titulo: /\bCompass\b/i, modelo: /^compass\b/i, marca: /jeep/i },
  { titulo: /\bKicks\b/i, modelo: /^kicks\b/i, marca: /nissan/i },
  { titulo: /\bTiggo\s*5X\s*PRO\b/i, modelo: /tiggo\s*5x\s*pro/i, marca: /chery|caoa/i },
  { titulo: /\bTiggo\s*5X\s*SPORT\b/i, modelo: /tiggo\s*5x\s*sport/i, marca: /chery|caoa/i },
  { titulo: /\bTiggo\s*5X\b/i, modelo: /tiggo\s*5x/i, marca: /chery|caoa/i },
  { titulo: /\bTiggo\b/i, modelo: /^tiggo\b/i, marca: /chery|caoa/i },
];

const ANO_RE = /(\d{4})\s*(?:até|a|-)\s*(\d{4})|(\d{4})\s*em\s*diante|\b(TODOS)\b/gi;

function yearRanges(titulo) {
  const out = [];
  for (const m of titulo.matchAll(ANO_RE)) {
    let ini;
    let fim;
    if (m[1]) [ini, fim] = [Number(m[1]), Number(m[2])];
    else if (m[3]) [ini, fim] = [Number(m[3]), ANO_CURRENT_END];
    else [ini, fim] = [1900, ANO_CURRENT_END];
    out.push({ idx: m.index, ini, fim });
  }
  return out;
}

function exclusoes(produto) {
  const txt = (produto.descricao ?? "").replace(/<[^>]+>/g, " ");
  const m = txt.match(/EXCETO\s+([^)\n.]+)/i);
  if (!m) return [];
  return m[1]
    .split(/\s*(?:,|\be\b|\/)\s*/i)
    .map((w) => w.trim().split(/\s+/).pop())
    .filter((w) => w && w.length > 2)
    .map((w) => new RegExp(`\\b${w.replace(/y$/i, "y?e?").replace(/rally/i, "rall(y|ye)")}\\b`, "i"));
}

function contiguousRuns(anos) {
  const runs = [];
  for (const a of [...anos].sort((x, y) => x - y)) {
    const last = runs[runs.length - 1];
    if (last && a === last.fim + 1) last.fim = a;
    else runs.push({ ini: a, fim: a });
  }
  return runs;
}

export function mapCompatFromTitulo(produto, catalogo) {
  const titulo = produto.titulo ?? "";
  const ranges = yearRanges(titulo);
  const excl = exclusoes(produto);
  const rows = [];
  const resumo = [];
  const naoMapeados = [];

  for (const v of VEICULOS) {
    const hit = titulo.match(v.titulo);
    if (!hit) continue;
    const range = ranges.find((r) => r.idx > hit.index) ?? ranges[ranges.length - 1];
    if (!range) {
      naoMapeados.push(`${hit[0]} (sem ano no título)`);
      continue;
    }
    const modelos = catalogo.filter(
      (m) => v.marca.test(m.marca) && v.modelo.test(m.nome) && !excl.some((re) => re.test(m.nome)),
    );
    let usados = 0;
    for (const m of modelos) {
      const anos = m.anos.filter((a) => a >= range.ini && a <= range.fim);
      if (!anos.length) continue;
      usados++;
      for (const run of contiguousRuns(anos)) rows.push({ modelo_id: m.id, ano_inicio: run.ini, ano_fim: run.fim });
    }
    const fimTxt = range.fim >= ANO_CURRENT_END ? "em diante" : `até ${range.fim}`;
    if (usados) resumo.push(`${hit[0]} ${range.ini} ${fimTxt}: ${usados} modelo(s)`);
    else naoMapeados.push(`${hit[0]} ${range.ini} ${fimTxt}`);
  }

  const seen = new Set();
  const unique = rows.filter((r) => {
    const k = `${r.modelo_id}|${r.ano_inicio}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { rows: unique, resumo, naoMapeados };
}

async function fetchAll(sb, table, select) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

export async function loadCatalogo(sb) {
  const [modelos, anos] = await Promise.all([
    fetchAll(sb, "modelos", "id, nome, marcas(nome)"),
    fetchAll(sb, "modelo_anos", "modelo_id, ano"),
  ]);
  const byModelo = new Map();
  for (const a of anos) {
    const list = byModelo.get(a.modelo_id) ?? [];
    list.push(Number(a.ano));
    byModelo.set(a.modelo_id, list);
  }
  return modelos.map((m) => ({
    id: m.id,
    nome: m.nome.trim(),
    marca: m.marcas?.nome ?? "",
    anos: byModelo.get(m.id) ?? [],
  }));
}