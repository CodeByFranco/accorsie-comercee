import sharp from "sharp";

const SIZE = 1200;
const PAD = 24;
const MAX_IMAGES = 9;
const FETCH_TIMEOUT_MS = 15_000;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function gridFor(n: number): { cols: number; rows: number } {
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
  return { cols, rows: Math.ceil(n / cols) };
}

/**
 * Monta a foto principal do kit: grade quadrada (fundo branco) com as fotos dos produtos.
 * Fotos que não carregarem são ignoradas; retorna null se nenhuma carregar.
 */
export async function buildKitCollage(imageUrls: string[]): Promise<Buffer | null> {
  const fetched = await Promise.all(imageUrls.slice(0, MAX_IMAGES).map(fetchImage));
  const decodable = await Promise.all(
    fetched.map(async (buf) => {
      if (!buf) return null;
      try {
        await sharp(buf).metadata();
        return buf;
      } catch {
        return null;
      }
    }),
  );
  const sources = decodable.filter((b): b is Buffer => b != null);
  if (sources.length === 0) return null;

  const { cols, rows } = gridFor(sources.length);
  const cell = Math.floor(
    Math.min((SIZE - PAD * (cols + 1)) / cols, (SIZE - PAD * (rows + 1)) / rows),
  );
  const gridH = rows * cell + (rows - 1) * PAD;
  const top0 = Math.round((SIZE - gridH) / 2);

  const tiles = await Promise.all(
    sources.map(async (buf) => {
      const flat = await sharp(buf).rotate().flatten({ background: WHITE }).png().toBuffer();
      // Corta a margem branca das fotos para o produto ocupar o quadro; imagem lisa não tem o que cortar.
      const trimmed = await sharp(flat).trim({ threshold: 12 }).toBuffer().catch(() => flat);
      return sharp(trimmed)
        .resize(cell, cell, { fit: "contain", background: WHITE })
        .png()
        .toBuffer();
    }),
  );

  const composites: sharp.OverlayOptions[] = tiles.map((input, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, tiles.length - row * cols);
    const rowW = inRow * cell + (inRow - 1) * PAD;
    const left0 = Math.round((SIZE - rowW) / 2);
    const col = i - row * cols;
    return { input, left: left0 + col * (cell + PAD), top: top0 + row * (cell + PAD) };
  });

  return sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: WHITE } })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toBuffer();
}
