/**
 * Vincula compatibilidade a partir do título (mesma lógica do import .docx).
 *
 *   node scripts/link-compat-from-title.mjs 70225 mb2212
 *   node scripts/link-compat-from-title.mjs 70225 mb2212 --apply
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { loadCatalogo, mapCompatFromTitulo } from "./lib/titleCompat.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  const env = {};
  for (const f of [".env", ".env.local"]) {
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

function normalizeCod(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const cods = argv.filter((a) => a !== "--apply");
  if (!cods.length) {
    console.error("Uso: node scripts/link-compat-from-title.mjs <codigo> [codigo...] [--apply]");
    process.exit(1);
  }

  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const catalogo = await loadCatalogo(sb);
  const { data: produtos, error } = await sb.from("produtos").select("id, cod_produto, titulo, descricao, compat_todos_modelos");
  if (error) throw new Error(error.message);

  const byCod = new Map(
    (produtos ?? []).map((p) => [normalizeCod(p.cod_produto), p]).filter(([k]) => k),
  );

  function resolveProduct(raw) {
    const key = normalizeCod(raw);
    const exact = byCod.get(key);
    if (exact) return exact;
    const prefix = (produtos ?? []).find((p) => {
      const c = normalizeCod(p.cod_produto);
      return c === key || c.startsWith(`${key}/`) || c.startsWith(`${key}-`);
    });
    if (prefix) return prefix;
    const matches = (produtos ?? []).filter((p) => normalizeCod(p.cod_produto).includes(key));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      console.log(`[${raw}] ambíguo (${matches.map((m) => m.cod_produto).join(", ")})`);
      return null;
    }
    return null;
  }

  for (const raw of cods) {
    const p = resolveProduct(raw);
    if (!p) {
      console.log(`[${raw}] não encontrado`);
      continue;
    }

    const compat = mapCompatFromTitulo(p, catalogo);
    console.log(`\n[${p.cod_produto}] ${p.titulo}`);
    console.log(`  linhas compat: ${compat.rows.length}`);
    if (compat.resumo.length) console.log(`  ok: ${compat.resumo.join(" | ")}`);
    if (compat.naoMapeados.length) console.log(`  sem modelo: ${compat.naoMapeados.join("; ")}`);

    if (!compat.rows.length) continue;
    if (!apply) {
      console.log("  (dry-run — use --apply para gravar)");
      continue;
    }

    await sb.from("produto_compatibilidades").delete().eq("produto_id", p.id);
    const { error: insErr } = await sb
      .from("produto_compatibilidades")
      .insert(compat.rows.map((r) => ({ produto_id: p.id, ...r })));
    if (insErr) console.log(`  ERRO: ${insErr.message}`);
    else {
      await sb.from("produtos").update({ compat_todos_modelos: false }).eq("id", p.id);
      console.log(`  gravado: ${compat.rows.length} linha(s)`);
    }
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});