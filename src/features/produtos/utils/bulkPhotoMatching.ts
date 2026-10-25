/**
 * Casa imagens com produtos pelo código.
 *
 * - Imagem solta na pasta escolhida: o nome do arquivo é o código ("AMD13025.png", "KS603791. KS603801.jpg").
 * - Imagem dentro de uma subpasta: o nome da subpasta é o código (todas as imagens dela vão para o produto).
 * - Do código do produto vale o texto inteiro ou a parte antes da "/" ("AMD13025/24679" -> "AMD13025").
 * - Sufixos de cópia no arquivo ("AMD13025 (2)", "AMD13025_2", "AMD13025-3") também casam.
 */

export type BulkPhotoMatchProduct = {
  id: string;
  cod_produto: string;
};

export type BulkPhotoGroup<P extends BulkPhotoMatchProduct> = {
  /** Nome da pasta ou do arquivo usado para casar. */
  chave: string;
  files: File[];
  product: P | null;
  /** Mais de um produto com o mesmo código. */
  ambiguos: P[];
};

export function normalizeCodigo(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\.+$/, "");
}

function codigoKeys(cod: string): string[] {
  const keys = new Set<string>();
  const full = normalizeCodigo(cod);
  if (full) keys.add(full);
  const antesBarra = normalizeCodigo(cod.split("/")[0] ?? "");
  if (antesBarra) keys.add(antesBarra);
  return [...keys];
}

function fileBaseName(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function stripCopySuffix(name: string): string {
  return name.replace(/\s*\(\d{1,2}\)$/, "").replace(/[\s_-]+\d{1,2}$/, "");
}

/** Pasta imediata do arquivo dentro da pasta escolhida (webkitRelativePath), ou null se estiver na raiz. */
function subfolderOf(file: File): string | null {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
  const parts = rel.split("/").filter(Boolean);
  return parts.length >= 3 ? parts[parts.length - 2] : null;
}

export function matchBulkPhotos<P extends BulkPhotoMatchProduct>(
  files: File[],
  products: P[]
): BulkPhotoGroup<P>[] {
  const byKey = new Map<string, P[]>();
  for (const p of products) {
    for (const key of codigoKeys(p.cod_produto)) {
      const list = byKey.get(key) ?? [];
      if (!list.some((x) => x.id === p.id)) list.push(p);
      byKey.set(key, list);
    }
  }

  const lookup = (raw: string): P[] => {
    const exact = byKey.get(normalizeCodigo(raw));
    if (exact?.length) return exact;
    return byKey.get(normalizeCodigo(stripCopySuffix(raw))) ?? [];
  };

  const groups = new Map<string, BulkPhotoGroup<P>>();
  for (const file of files) {
    const folder = subfolderOf(file);
    const chave = folder ?? stripCopySuffix(fileBaseName(file.name).trim());
    const candidatos = folder ? lookup(folder) : lookup(fileBaseName(file.name).trim());
    const product = candidatos.length === 1 ? candidatos[0] : null;
    const groupKey = product ? `p:${product.id}` : `k:${normalizeCodigo(chave)}`;

    const group = groups.get(groupKey) ?? {
      chave,
      files: [],
      product,
      ambiguos: candidatos.length > 1 ? candidatos : [],
    };
    group.files.push(file);
    groups.set(groupKey, group);
  }

  for (const g of groups.values()) {
    g.files.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
  }
  return [...groups.values()].sort((a, b) => a.chave.localeCompare(b.chave, "pt-BR", { numeric: true }));
}
