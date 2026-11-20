import { DEFAULT_MANIFESTO_TEXTO } from "@/features/site-layout/utils/institucional";

export type SobreFundo = "claro" | "creme" | "cinza" | "escuro" | "personalizado";
export type SobreIcone = "escudo" | "raio" | "pessoas" | "estrela" | "chave" | "carro" | "relogio" | "coracao";

export const SOBRE_ICONES: Array<{ value: SobreIcone; label: string }> = [
  { value: "escudo", label: "Escudo" },
  { value: "raio", label: "Raio" },
  { value: "pessoas", label: "Pessoas" },
  { value: "estrela", label: "Estrela" },
  { value: "chave", label: "Chave" },
  { value: "carro", label: "Carro" },
  { value: "relogio", label: "Relógio" },
  { value: "coracao", label: "Coração" },
];

export const SOBRE_FUNDOS: Array<{ value: SobreFundo; label: string }> = [
  { value: "claro", label: "Branco" },
  { value: "creme", label: "Creme" },
  { value: "cinza", label: "Cinza claro" },
  { value: "escuro", label: "Azul escuro" },
  { value: "personalizado", label: "Outra cor…" },
];

type Base = {
  id: string;
  visivel: boolean;
  fundo: SobreFundo;
  /** Só quando `fundo === "personalizado"` (#rrggbb). */
  fundo_cor?: string;
};

export type SobreBlocoImagemTexto = Base & {
  tipo: "imagem_texto";
  etiqueta: string;
  titulo: string;
  /** Parágrafos separados por linha em branco. */
  texto: string;
  imagem_url: string;
  imagem_alt: string;
  imagem_lado: "esquerda" | "direita";
  botao_texto: string;
  botao_link: string;
};

export type SobreBlocoPilares = Base & {
  tipo: "pilares";
  etiqueta: string;
  titulo: string;
  /** Parágrafo de introdução (opcional). */
  texto: string;
  itens: Array<{ icone: SobreIcone; titulo: string; texto: string }>;
};

export type SobreBlocoManifesto = Base & {
  tipo: "manifesto";
  titulo: string;
  /** Uma frase por linha; linha em branco separa blocos. */
  texto: string;
};

export type SobreBlocoTexto = Base & {
  tipo: "texto";
  titulo: string;
  texto: string;
  alinhamento: "esquerda" | "centro";
};

export type SobreBlocoGaleria = Base & {
  tipo: "galeria";
  etiqueta: string;
  titulo: string;
  imagens: Array<{ url: string; legenda: string }>;
};

/** Capa de tela cheia: foto de fundo escurecida, título grande e botão. */
export type SobreBlocoCapa = Base & {
  tipo: "capa";
  etiqueta: string;
  titulo: string;
  texto: string;
  imagem_url: string;
  imagem_alt: string;
  botao_texto: string;
  botao_link: string;
};

export type SobreBlocoLinhaTempo = Base & {
  tipo: "linha_tempo";
  etiqueta: string;
  titulo: string;
  texto: string;
  itens: Array<{ ano: string; titulo: string; texto: string }>;
};

/** Faixa final com chamada para ação (foto de fundo opcional). */
export type SobreBlocoChamada = Base & {
  tipo: "chamada";
  titulo: string;
  texto: string;
  imagem_url: string;
  botao_texto: string;
  botao_link: string;
};

export type SobreBloco =
  | SobreBlocoCapa
  | SobreBlocoLinhaTempo
  | SobreBlocoChamada
  | SobreBlocoImagemTexto
  | SobreBlocoPilares
  | SobreBlocoManifesto
  | SobreBlocoTexto
  | SobreBlocoGaleria;

export type SobreBlocoTipo = SobreBloco["tipo"];

export const SOBRE_TIPOS: Array<{ value: SobreBlocoTipo; label: string; descricao: string }> = [
  { value: "capa", label: "Capa", descricao: "Foto de fundo em tela cheia com título grande." },
  { value: "linha_tempo", label: "Linha do tempo", descricao: "Anos e marcos da história." },
  { value: "chamada", label: "Chamada final", descricao: "Faixa com convite e botão." },
  { value: "imagem_texto", label: "Imagem + texto", descricao: "Foto de um lado, título e texto do outro." },
  { value: "texto", label: "Texto", descricao: "Título e parágrafos." },
  { value: "pilares", label: "Destaques", descricao: "Cartõezinhos com ícone, título e frase curta." },
  { value: "manifesto", label: "Manifesto", descricao: "Frases grandes em destaque." },
  { value: "galeria", label: "Galeria de fotos", descricao: "Grade de fotos com legenda opcional." },
];

export function novoId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function novoBloco(tipo: SobreBlocoTipo): SobreBloco {
  const base = { id: novoId(), visivel: true, fundo: "claro" as SobreFundo };
  switch (tipo) {
    case "imagem_texto":
      return {
        ...base,
        tipo,
        etiqueta: "",
        titulo: "Novo título",
        texto: "Escreva aqui.",
        imagem_url: "",
        imagem_alt: "",
        imagem_lado: "esquerda",
        botao_texto: "",
        botao_link: "",
      };
    case "pilares":
      return {
        ...base,
        tipo,
        etiqueta: "",
        titulo: "",
        texto: "",
        itens: [{ icone: "estrela", titulo: "Destaque", texto: "Frase curta." }],
      };
    case "capa":
      return {
        ...base,
        tipo,
        fundo: "escuro",
        etiqueta: "",
        titulo: "Novo título",
        texto: "",
        imagem_url: "",
        imagem_alt: "",
        botao_texto: "",
        botao_link: "",
      };
    case "linha_tempo":
      return {
        ...base,
        tipo,
        fundo: "creme",
        etiqueta: "Linha do tempo",
        titulo: "Nossa história",
        texto: "",
        itens: [{ ano: "2016", titulo: "Marco", texto: "Descrição curta." }],
      };
    case "chamada":
      return {
        ...base,
        tipo,
        fundo: "escuro",
        titulo: "Venha nos visitar",
        texto: "",
        imagem_url: "",
        botao_texto: "",
        botao_link: "",
      };
    case "manifesto":
      return { ...base, tipo, fundo: "escuro", titulo: "Manifesto", texto: "Primeira frase em destaque." };
    case "texto":
      return { ...base, tipo, titulo: "Novo título", texto: "Escreva aqui.", alinhamento: "esquerda" };
    case "galeria":
      return { ...base, tipo, etiqueta: "", titulo: "", imagens: [] };
  }
}

export function defaultSobreBlocos(manifestoTexto?: string | null): SobreBloco[] {
  return [
    {
      id: "capa",
      tipo: "capa",
      visivel: true,
      fundo: "escuro",
      etiqueta: "Accorsi Auto Peças",
      titulo: "Tradição & família desde 2016",
      texto:
        "Empresa familiar nascida no segmento de auto elétrica. Peças de reposição com a orientação de quem vive o setor automotivo todos os dias.",
      imagem_url: "/sobre/loja.jpg",
      imagem_alt: "Fachada da Accorsi Auto Peças",
      botao_texto: "Ver produtos",
      botao_link: "/produtos",
    },
    {
      id: "inicio",
      tipo: "imagem_texto",
      visivel: true,
      fundo: "creme",
      etiqueta: "Quem somos",
      titulo: "Mais do que vender peças",
      texto: [
        "Com origem no segmento de auto elétrica, a Accorsi Auto Peças atua no mercado desde 2016, com foco na reposição de peças automotivas, construída na vivência do dia a dia do setor e na leitura precisa das necessidades de quem depende do serviço.",
        "Somos uma empresa familiar, com sólida experiência no ramo automotivo.",
      ].join("\n\n"),
      imagem_url: "/sobre/loja.jpg",
      imagem_alt: "Fachada da Accorsi Auto Peças",
      imagem_lado: "direita",
      botao_texto: "",
      botao_link: "",
    },
    {
      id: "pilares",
      tipo: "pilares",
      visivel: true,
      fundo: "escuro",
      etiqueta: "O que nos move",
      titulo: "Atender bem, orientar com segurança",
      texto: "",
      itens: [
        { icone: "escudo", titulo: "Segurança na escolha", texto: "A peça certa para quem depende do carro no dia a dia." },
        { icone: "raio", titulo: "Agilidade no atendimento", texto: "Resposta rápida quando o serviço não pode esperar." },
        { icone: "pessoas", titulo: "Confiança em cada solução", texto: "Experiência de quem vive o setor automotivo desde 2016." },
        { icone: "coracao", titulo: "Empresa familiar", texto: "Respeito e lealdade como base de um negócio sólido." },
      ],
    },
    {
      id: "historia",
      tipo: "linha_tempo",
      visivel: true,
      fundo: "creme",
      etiqueta: "Linha do tempo",
      titulo: "Nossa trajetória",
      texto: "Da auto elétrica à loja online, os marcos da Accorsi.",
      itens: [
        { ano: "Origem", titulo: "Auto elétrica", texto: "A família começa no segmento de auto elétrica." },
        { ano: "2016", titulo: "Nasce a Accorsi Auto Peças", texto: "Foco na reposição de peças automotivas em Bento Gonçalves." },
        { ano: "Hoje", titulo: "Loja online", texto: "O mesmo atendimento, agora também pela internet." },
      ],
    },
    {
      id: "manifesto",
      tipo: "manifesto",
      visivel: true,
      fundo: "escuro",
      titulo: "Manifesto",
      texto: manifestoTexto?.trim() || DEFAULT_MANIFESTO_TEXTO,
    },
    {
      id: "chamada",
      tipo: "chamada",
      visivel: true,
      fundo: "escuro",
      titulo: "Encontre a peça certa",
      texto: "Pesquise pelo seu veículo ou fale com a nossa equipe.",
      imagem_url: "/sobre/loja.jpg",
      botao_texto: "Ver produtos",
      botao_link: "/produtos",
    },
  ];
}

/* ---------- validação (dados vêm do banco / do formulário) ---------- */

const str = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");
const oneOf = <T extends string>(v: unknown, opts: readonly T[], fallback: T): T =>
  opts.includes(v as T) ? (v as T) : fallback;
const FUNDOS = ["claro", "creme", "cinza", "escuro", "personalizado"] as const;
const HEX = /^#[0-9a-f]{6}$/i;

/** Cor clara ou escura? Decide a cor do texto em fundo personalizado. */
export function corEscura(hex: string): boolean {
  if (!HEX.test(hex)) return false;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) < 0.4;
}

export function fundoEscuro(b: { fundo: SobreFundo; fundo_cor?: string }): boolean {
  if (b.fundo === "personalizado") return corEscura(b.fundo_cor ?? "");
  return b.fundo === "escuro";
}
const ICONES = SOBRE_ICONES.map((i) => i.value);

/** Só aceita link interno ("/...") ou http(s). */
export function safeHref(v: string): string {
  const s = v.trim();
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return "";
}

export function safeImageUrl(v: string): string {
  const s = v.trim();
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  if (/^https:\/\//i.test(s)) return s;
  return "";
}

function parseBloco(raw: unknown): SobreBloco | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const base = {
    id: str(r.id, 40) || novoId(),
    visivel: r.visivel !== false,
    fundo: oneOf(r.fundo, FUNDOS, "claro"),
    fundo_cor: HEX.test(str(r.fundo_cor, 7)) ? str(r.fundo_cor, 7) : "#ffffff",
  };
  switch (r.tipo) {
    case "imagem_texto":
      return {
        ...base,
        tipo: "imagem_texto",
        etiqueta: str(r.etiqueta, 80),
        titulo: str(r.titulo, 200),
        texto: str(r.texto),
        imagem_url: safeImageUrl(str(r.imagem_url, 1000)),
        imagem_alt: str(r.imagem_alt, 200),
        imagem_lado: oneOf(r.imagem_lado, ["esquerda", "direita"] as const, "esquerda"),
        botao_texto: str(r.botao_texto, 60),
        botao_link: safeHref(str(r.botao_link, 500)),
      };
    case "pilares":
      return {
        ...base,
        tipo: "pilares",
        etiqueta: str(r.etiqueta, 80),
        titulo: str(r.titulo, 200),
        texto: str(r.texto, 1000),
        itens: (Array.isArray(r.itens) ? r.itens : []).slice(0, 12).map((it) => {
          const i = (it ?? {}) as Record<string, unknown>;
          return { icone: oneOf(i.icone, ICONES, "estrela"), titulo: str(i.titulo, 120), texto: str(i.texto, 300) };
        }),
      };
    case "manifesto":
      return { ...base, tipo: "manifesto", titulo: str(r.titulo, 120), texto: str(r.texto) };
    case "texto":
      return {
        ...base,
        tipo: "texto",
        titulo: str(r.titulo, 200),
        texto: str(r.texto),
        alinhamento: oneOf(r.alinhamento, ["esquerda", "centro"] as const, "esquerda"),
      };
    case "galeria":
      return {
        ...base,
        tipo: "galeria",
        etiqueta: str(r.etiqueta, 80),
        titulo: str(r.titulo, 200),
        imagens: (Array.isArray(r.imagens) ? r.imagens : [])
          .slice(0, 24)
          .map((it) => {
            const i = (it ?? {}) as Record<string, unknown>;
            return { url: safeImageUrl(str(i.url, 1000)), legenda: str(i.legenda, 200) };
          })
          .filter((i) => i.url),
      };
    case "capa":
      return {
        ...base,
        tipo: "capa",
        etiqueta: str(r.etiqueta, 80),
        titulo: str(r.titulo, 200),
        texto: str(r.texto, 1000),
        imagem_url: safeImageUrl(str(r.imagem_url, 1000)),
        imagem_alt: str(r.imagem_alt, 200),
        botao_texto: str(r.botao_texto, 60),
        botao_link: safeHref(str(r.botao_link, 500)),
      };
    case "linha_tempo":
      return {
        ...base,
        tipo: "linha_tempo",
        etiqueta: str(r.etiqueta, 80),
        titulo: str(r.titulo, 200),
        texto: str(r.texto, 1000),
        itens: (Array.isArray(r.itens) ? r.itens : []).slice(0, 20).map((it) => {
          const i = (it ?? {}) as Record<string, unknown>;
          return { ano: str(i.ano, 20), titulo: str(i.titulo, 120), texto: str(i.texto, 400) };
        }),
      };
    case "chamada":
      return {
        ...base,
        tipo: "chamada",
        titulo: str(r.titulo, 200),
        texto: str(r.texto, 1000),
        imagem_url: safeImageUrl(str(r.imagem_url, 1000)),
        botao_texto: str(r.botao_texto, 60),
        botao_link: safeHref(str(r.botao_link, 500)),
      };
    default:
      return null;
  }
}

/** `null` quando não há nada salvo (usa o padrão). */
export function parseSobreBlocos(raw: unknown): SobreBloco[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.slice(0, 40).map(parseBloco).filter((b): b is SobreBloco => b !== null);
}

export function paragrafos(texto: string): string[] {
  return texto
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
