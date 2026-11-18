export type SiteInstitucional = {
  /** Uma frase por linha; linhas em branco separam blocos do manifesto. */
  manifesto_texto: string;
  /** Um horário por linha (ex.: "Sábado: 8h — 11h30"). */
  horarios_texto: string;
};

export const DEFAULT_MANIFESTO_TEXTO = [
  "Somos guiados pela tradição e movidos pela evolução.",
  "",
  "A Accorsi Auto Peças nasce de uma história construída com seriedade, honestidade e confiança, valores consolidados na prática, todos os dias.",
  "",
  "Tradição e modernidade caminham juntas.",
  "",
  "Carregamos o legado de uma família que sempre acreditou no respeito e na lealdade como base de um negócio sólido.",
  "É isso que sustenta nossas decisões.",
  "É isso que mantém a consistência do nosso trabalho.",
  "",
  "Seguimos evoluindo com foco no que realmente importa: atender bem, orientar com segurança e entregar soluções que funcionam no dia a dia do cliente.",
  "",
  "Confiança não é promessa.",
  "É consistência comprovada em cada atendimento.",
].join("\n");

export const DEFAULT_HORARIOS_TEXTO = ["Segunda a sexta: 8h — 18h", "Sábado: 8h — 11h30"].join("\n");

export function parseSiteInstitucional(
  data: { manifesto_texto?: string | null; horarios_texto?: string | null } | null | undefined,
): SiteInstitucional {
  const manifesto = data?.manifesto_texto?.trim();
  const horarios = data?.horarios_texto?.trim();
  return {
    manifesto_texto: manifesto || DEFAULT_MANIFESTO_TEXTO,
    horarios_texto: horarios || DEFAULT_HORARIOS_TEXTO,
  };
}

/** Blocos (separados por linha em branco), cada um com suas linhas. */
export function manifestoBlocks(texto: string): string[][] {
  return texto
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    )
    .filter((b) => b.length > 0);
}

export function textLines(texto: string): string[] {
  return texto
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
