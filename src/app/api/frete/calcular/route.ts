import { cotarFreteServidor, normalizeCep } from "@/services/melhorEnvio/cotarFreteServidor";
import { createClient } from "@/services/supabase/server";

export const dynamic = "force-dynamic";

const MAX_ITENS = 40;
const MAX_QTY_PER_ITEM = 999;

type BodyItem = { produto_id?: unknown; quantidade?: unknown };

function parseBodyItems(body: unknown): Map<string, number> | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "JSON inválido." };
  }
  const o = body as Record<string, unknown>;
  const itens = o.itens;
  if (!Array.isArray(itens) || itens.length === 0) {
    return { error: "Envie `itens` com ao menos um produto." };
  }
  if (itens.length > MAX_ITENS) {
    return { error: `Limite de ${MAX_ITENS} itens por cotação.` };
  }

  const merged = new Map<string, number>();
  for (const raw of itens) {
    if (!raw || typeof raw !== "object") {
      return { error: "Item do carrinho inválido." };
    }
    const item = raw as BodyItem;
    const pid = item.produto_id;
    if (typeof pid !== "string" || !pid.trim()) {
      return { error: "Cada item precisa de `produto_id` (string)." };
    }
    const q = item.quantidade;
    if (typeof q !== "number" || !Number.isInteger(q) || q < 1) {
      return { error: "Quantidade inválida em um dos itens." };
    }
    if (q > MAX_QTY_PER_ITEM) {
      return { error: `Quantidade máxima por item: ${MAX_QTY_PER_ITEM}.` };
    }
    const id = pid.trim();
    merged.set(id, (merged.get(id) ?? 0) + q);
  }
  return merged;
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const o = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  const cepRaw = o ? (o.cep_destino ?? o.cep) : null;
  if (!normalizeCep(cepRaw)) {
    return Response.json(
      { error: "Informe `cep_destino` (ou `cep`) com 8 dígitos." },
      { status: 400 },
    );
  }

  const parsedItems = parseBodyItems(json);
  if ("error" in parsedItems) {
    return Response.json({ error: parsedItems.error }, { status: 400 });
  }

  /** Leitura de produtos/embalagens com a sessão da requisição (anon ou logado); RLS já restringe o catálogo. */
  const supabase = await createClient();
  const result = await cotarFreteServidor(supabase, cepRaw, parsedItems);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ opcoes: result.opcoes });
}
