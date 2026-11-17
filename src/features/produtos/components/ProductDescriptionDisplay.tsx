import {
  isHtmlDescriptionEmpty,
  prepareProductDescriptionForDisplay,
} from "@/features/produtos/utils/sanitizeProductDescription";

const htmlShell =
  "product-description-html text-sm leading-relaxed text-store-navy [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_b]:font-bold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:leading-snug";

type Props = {
  descricao: string;
  emptyMessage?: string;
};

export function ProductDescriptionDisplay({
  descricao,
  emptyMessage = "Sem descrição cadastrada para este produto.",
}: Props) {
  const raw = descricao.trim();
  if (!raw) {
    return <p className="text-sm text-store-navy-muted">{emptyMessage}</p>;
  }

  const safe = prepareProductDescriptionForDisplay(raw);
  if (!safe || isHtmlDescriptionEmpty(safe)) {
    return <p className="text-sm text-store-navy-muted">{emptyMessage}</p>;
  }

  return <div className={htmlShell} dangerouslySetInnerHTML={{ __html: safe }} />;
}