import sanitizeHtml from "sanitize-html";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li"],
  allowedAttributes: {
    p: ["style"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Marcadores de lista no meio do parágrafo (importação / texto legado). */
function hasInlineBulletMarkers(text: string): boolean {
  return /\s[*•]\s+\S/.test(text);
}

function splitParagraphWithInlineBullets(text: string): string {
  const idx = text.search(/\s[*•]\s+/);
  if (idx < 0) {
    return `<p>${escapeHtml(text)}</p>`;
  }
  const intro = text.slice(0, idx).trim();
  const tail = text.slice(idx).trim();
  const items = tail
    .split(/\s+[*•]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const introHtml = intro ? `<p>${escapeHtml(intro)}</p>` : "";
  const listHtml =
    items.length > 0 ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
  return `${introHtml}${listHtml}`;
}

function formatPlainTextBlock(block: string): string {
  const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1 && lines.every((l) => /^[*•-]\s+/.test(l))) {
    return `<ul>${lines.map((l) => `<li>${escapeHtml(l.replace(/^[*•-]\s+/, ""))}</li>`).join("")}</ul>`;
  }
  const joined = lines.join(" ");
  if (hasInlineBulletMarkers(joined)) {
    return splitParagraphWithInlineBullets(joined);
  }
  return `<p>${escapeHtml(joined)}</p>`;
}

function plainTextToDescriptionHtml(text: string): string {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks.map(formatPlainTextBlock).join("");
}

/** Corrige parágrafos HTML com bullets inline (ex.: "Conteúdo do kit: * item * item"). */
function enrichInlineBulletListsInHtml(html: string): string {
  return html.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (_match, attrs: string, inner: string) => {
    const text = inner
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!hasInlineBulletMarkers(text)) {
      return `<p${attrs}>${inner}</p>`;
    }
    return splitParagraphWithInlineBullets(text);
  });
}

/** HTML seguro para gravar no banco ou exibir na vitrine. */
export function sanitizeProductDescriptionHtml(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return sanitizeHtml(trimmed, SANITIZE_OPTIONS).trim();
}

/** Prepara texto/HTML da descrição para a vitrine (listas, parágrafos). */
export function prepareProductDescriptionForDisplay(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (isStoredProductDescriptionHtml(trimmed)) {
    const safe = sanitizeProductDescriptionHtml(trimmed);
    return enrichInlineBulletListsInHtml(safe);
  }

  return sanitizeProductDescriptionHtml(plainTextToDescriptionHtml(trimmed));
}

/** True se o conteúdo parece HTML vindo do editor (vs. texto legado). */
export function isStoredProductDescriptionHtml(raw: string): boolean {
  return /<\s*(p|div|strong|b|br|em|ul|ol|li)\b/i.test(raw);
}

/** Remove tags e normaliza entidades básicas para checar se há texto. */
export function isHtmlDescriptionEmpty(html: string): boolean {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}