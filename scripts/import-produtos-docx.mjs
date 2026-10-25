/**
 * Importa produtos de um .docx (blocos "CÓDIGO PRODUTO / NOME / DESCRIÇÃO / VALOR ...")
 * como RASCUNHO (status = draft), com categoria e compatibilidades mapeadas a partir do nome.
 *
 * Uso:
 *   node scripts/import-produtos-docx.mjs "C:/caminho/arquivo.docx"            (dry-run: só relatório)
 *   node scripts/import-produtos-docx.mjs "C:/caminho/arquivo.docx" --apply    (grava no Supabase)
 *   --report caminho.md   onde salvar o relatório (padrão: import-produtos-relatorio.md ao lado do .docx)
 *
 * Usa NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY de .env / .env.local.
 * Códigos já existentes no banco (ou repetidos no arquivo) são pulados.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ANO_ATUAL = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Args / env
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  let input = null;
  let apply = false;
  let report = null;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") apply = true;
    else if (a === "--report" && argv[i + 1]) report = resolve(argv[++i]);
    else if (!input) input = resolve(a);
  }
  if (!input) {
    console.error('Uso: node scripts/import-produtos-docx.mjs "arquivo.docx" [--apply] [--report saida.md]');
    process.exit(1);
  }
  return { input, apply, report: report ?? join(dirname(input), "import-produtos-relatorio.md") };
}

function loadEnv() {
  const env = {};
  for (const f of [".env", ".env.local"]) {
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return { ...env, ...process.env };
}

// ---------------------------------------------------------------------------
// .docx -> texto (zip mínimo, sem dependências)
// ---------------------------------------------------------------------------

function readZipEntry(buf, name) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("Arquivo .docx inválido (zip sem diretório central).");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const entryName = buf.toString("utf8", p + 46, p + 46 + nameLen);
    if (entryName === name) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      return method === 0 ? data : inflateRawSync(data);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`Entrada ${name} não encontrada no .docx.`);
}

function decodeXml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function docxToLines(path) {
  const xml = readZipEntry(readFileSync(path), "word/document.xml").toString("utf8");
  return decodeXml(
    xml
      .replace(/<w:tab\/>/g, " ")
      .replace(/<w:br\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((l) => l.replace(/\u00a0/g, " ").trim());
}

// ---------------------------------------------------------------------------
// Parsing dos blocos
// ---------------------------------------------------------------------------

const LABELS = [
  ["cod", /^C[ÓO]DIGO( DO)? PRODUTO\s*:/i],
  ["nome", /^NOME\s*:/i],
  ["descricao", /^DESCRI[ÇC][ÃA]O\s*:/i],
  ["valor", /^VALOR\s*:/i],
  ["pix", /^DESCONTO EM PIX\s*:/i],
  ["cartao", /^DESCONTO EM CART[ÃA]O\s*:/i],
  ["estoque", /^QUANTIDADE( EM)? ESTOQUE\s*:/i],
  ["categorias", /^CATEGORIAS?\s*:/i],
  ["comprimento", /^COMPRIMENTO\s*:/i],
  ["largura", /^LARGURA\s*:/i],
  ["altura", /^ALTURA\s*:/i],
  ["peso", /^PESO\s*:/i],
];

/** Blocos separados por linhas "-----"; a ordem dos rótulos dentro do bloco varia. */
function splitBlocks(lines) {
  const blocks = [];
  let cur = { _lines: {} };
  let field = null;
  const flush = () => {
    if (Object.keys(cur._lines).length) blocks.push(cur);
    cur = { _lines: {} };
    field = null;
  };
  for (const raw of lines) {
    if (/^-{3,}$/.test(raw)) {
      flush();
      continue;
    }
    const hit = LABELS.find(([, re]) => re.test(raw));
    if (hit) {
      const [key, re] = hit;
      const value = raw.replace(re, "").trim();
      // código repetido no mesmo bloco (ex.: "CÓDIGO PRODUTO: 11" solto): fica o mais longo
      if (key === "cod" && cur._lines.cod && cur._lines.cod.join("").length >= value.length) {
        field = null;
        continue;
      }
      field = key;
      cur._lines[key] = [value];
      continue;
    }
    if (field) cur._lines[field].push(raw);
  }
  flush();
  return blocks;
}

function firstNumber(s) {
  const m = String(s ?? "").match(/\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(",", ".")) : null;
}

function parseValor(s) {
  // "R$ 1.016,00", "470,00 jogo", "270"
  const m = String(s ?? "").match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/);
  return m ? Number(m[0].replace(/\./g, "").replace(",", ".")) : null;
}

function parsePesoKg(s) {
  const n = firstNumber(s);
  if (n == null) return null;
  return /kg/i.test(s) || n < 50 ? n : n / 1000;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function descricaoToHtml(lines) {
  const paras = lines.map((l) => l.trim()).filter(Boolean);
  if (!paras.length) return null;
  return paras
    .map((p) =>
      /^(IMPORTANTE\b|GARANTIA$)/i.test(p) ? `<p><strong>${escapeHtml(p)}</strong></p>` : `<p>${escapeHtml(p)}</p>`
    )
    .join("");
}

function buildProduct(block) {
  const L = block._lines;
  const one = (k) => (L[k] ?? []).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const avisos = [];
  const valorTxt = one("valor");
  if (/[a-z]{3,}/i.test(valorTxt.replace(/R\$/i, ""))) avisos.push(`valor com texto extra: "${valorTxt}"`);
  const catTxt = one("categorias");
  if (/\d/.test(catTxt)) avisos.push(`categoria com texto extra: "${catTxt}"`);
  return {
    cod_produto: one("cod"),
    titulo: one("nome"),
    descricao: descricaoToHtml(L.descricao ?? []),
    valor: parseValor(valorTxt),
    desconto_pix_percent: firstNumber(one("pix")),
    desconto_cartao_percent: firstNumber(one("cartao")),
    quantidade_estoque: firstNumber(one("estoque")),
    categoria: catTxt.replace(/[\d,.]+\s*cm/gi, "").trim(),
    prod_comprimento_cm: firstNumber(one("comprimento")),
    prod_largura_cm: firstNumber(one("largura")),
    prod_altura_cm: firstNumber(one("altura")),
    prod_peso_kg: L.peso ? parsePesoKg(one("peso")) : null,
    avisos,
  };
}

// ---------------------------------------------------------------------------
// Compatibilidade: veículos citados no título -> modelos do catálogo
// ---------------------------------------------------------------------------

/** chave no título -> { modelo: regex no nome do modelo, marca: regex no nome da marca } */
const VEICULOS = [
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
];

const ANO_RE = /(\d{4})\s*(?:até|a|-)\s*(\d{4})|(\d{4})\s*em\s*diante|\b(TODOS)\b/gi;

/** Faixas de ano no título, na ordem em que aparecem. */
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
const ANO_CURRENT_END = ANO_ATUAL + 1;

/** Exclusões citadas na descrição, ex.: "(EXCETO GOL RALLY e TRACK)". */
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

/** Divide anos disponíveis em faixas contínuas (cada ano precisa existir em modelo_anos). */
function contiguousRuns(anos) {
  const runs = [];
  for (const a of [...anos].sort((x, y) => x - y)) {
    const last = runs[runs.length - 1];
    if (last && a === last.fim + 1) last.fim = a;
    else runs.push({ ini: a, fim: a });
  }
  return runs;
}

function mapCompat(produto, catalogo) {
  const titulo = produto.titulo;
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
      (m) => v.marca.test(m.marca) && v.modelo.test(m.nome) && !excl.some((re) => re.test(m.nome))
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

  // dedup (pk = produto, modelo, ano_inicio)
  const seen = new Set();
  const unique = rows.filter((r) => {
    const k = `${r.modelo_id}|${r.ano_inicio}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { rows: unique, resumo, naoMapeados };
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

async function fetchAll(sb, table, select) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

async function loadCatalogo(sb) {
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

function normalize(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Compara nomes de categoria tolerando "Suspens\u00e3o" x "Suspen\u00e7\u00e3o". */
function categoriaKey(s) {
  return normalize(s).replace(/c(?=a?o\b)/g, "s");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { input, apply, report } = parseArgs(process.argv);
  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.");
  }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const produtos = splitBlocks(docxToLines(input)).map(buildProduct);
  const [catalogo, categorias, existentes] = await Promise.all([
    loadCatalogo(sb),
    fetchAll(sb, "categorias", "id, nome"),
    fetchAll(sb, "produtos", "cod_produto, titulo"),
  ]);
  const titulosSemCodigo = new Set(existentes.filter((p) => !p.cod_produto).map((p) => normalize(p.titulo ?? "")));
  const catByNome = new Map(categorias.map((c) => [categoriaKey(c.nome), c.id]));
  const codExistentes = new Set(existentes.map((p) => normalize(p.cod_produto ?? "")));
  const codNoArquivo = new Set();

  const linhas = [];
  let importados = 0;
  let pulados = 0;
  let totalCompat = 0;

  for (const [i, p] of produtos.entries()) {
    const n = i + 1;
    const avisos = [...p.avisos];
    const codKey = normalize(p.cod_produto);
    let pular = null;
    if (!p.cod_produto) {
      p.cod_produto = null;
      avisos.push("sem código (entra como rascunho sem código)");
      if (titulosSemCodigo.has(normalize(p.titulo))) pular = "já existe rascunho sem código com este título";
    } else if (codExistentes.has(codKey)) pular = "código já existe no banco";
    else if (codNoArquivo.has(codKey)) pular = "código repetido no arquivo";
    if (p.cod_produto) codNoArquivo.add(codKey);

    for (const [campo, label] of [
      ["titulo", "nome"],
      ["valor", "valor"],
      ["quantidade_estoque", "estoque"],
      ["prod_comprimento_cm", "comprimento"],
      ["prod_largura_cm", "largura"],
      ["prod_altura_cm", "altura"],
      ["prod_peso_kg", "peso"],
    ]) {
      if (p[campo] == null || p[campo] === "") avisos.push(`sem ${label}`);
    }
    if (!p.descricao) avisos.push("sem descrição");

    const categoriaId = catByNome.get(categoriaKey(p.categoria));
    if (!categoriaId) avisos.push(`categoria "${p.categoria}" não encontrada`);

    const compat = mapCompat(p, catalogo);
    if (compat.naoMapeados.length) avisos.push(`veículo sem modelo no catálogo: ${compat.naoMapeados.join("; ")}`);
    if (!compat.rows.length) avisos.push("nenhuma compatibilidade mapeada");

    let status = pular ? `PULADO (${pular})` : apply ? "importado" : "ok (dry-run)";

    if (!pular && apply) {
      const { avisos: _a, categoria: _c, ...campos } = p;
      const { data, error } = await sb
        .from("produtos")
        .insert({ ...campos, quantidade_estoque: campos.quantidade_estoque ?? 0, status: "draft" })
        .select("id")
        .single();
      if (error) {
        status = `ERRO: ${error.message}`;
      } else {
        const id = data.id;
        if (categoriaId) {
          const { error: e } = await sb.from("produto_categorias").insert({ produto_id: id, categoria_id: categoriaId });
          if (e) avisos.push(`categoria não vinculada: ${e.message}`);
        }
        if (compat.rows.length) {
          const { error: e } = await sb
            .from("produto_compatibilidades")
            .insert(compat.rows.map((r) => ({ produto_id: id, ...r })));
          if (e) avisos.push(`compatibilidade não gravada: ${e.message}`);
        }
      }
    }

    if (pular) pulados++;
    else {
      importados++;
      totalCompat += compat.rows.length;
    }
    linhas.push({ n, p, status, compat, avisos });
  }

  const md = [
    `# Importação de produtos ${apply ? "" : "(dry-run)"}`,
    "",
    `Arquivo: ${input}`,
    `Produtos lidos: ${produtos.length} · ${apply ? "importados" : "a importar"}: ${importados} · pulados: ${pulados} · linhas de compatibilidade: ${totalCompat}`,
    "",
    ...linhas.flatMap(({ n, p, status, compat, avisos }) => [
      `## ${n}. ${p.cod_produto || "(sem código)"} — ${status}`,
      `${p.titulo}`,
      `R$ ${p.valor} · PIX ${p.desconto_pix_percent}% · cartão ${p.desconto_cartao_percent}% · estoque ${p.quantidade_estoque} · ${p.prod_comprimento_cm}x${p.prod_largura_cm}x${p.prod_altura_cm} cm · ${p.prod_peso_kg} kg · ${p.categoria}`,
      compat.resumo.length ? `Compatibilidade: ${compat.resumo.join(" | ")}` : "Compatibilidade: —",
      ...avisos.map((a) => `- ⚠ ${a}`),
      "",
    ]),
  ].join("\n");
  writeFileSync(report, md, "utf8");

  const comAviso = linhas.filter((l) => l.avisos.length).length;
  console.log(
    `${apply ? "Importados" : "A importar"}: ${importados} · pulados: ${pulados} · compat: ${totalCompat} · com avisos: ${comAviso}`
  );
  console.log(`Relatório: ${report}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
