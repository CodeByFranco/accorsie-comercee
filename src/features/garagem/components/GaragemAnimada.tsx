"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

/** Disparado pelo aviso de boas-vindas ao ser fechado. */
export const AVISO_FECHADO_EVENT = "accorsi:aviso-fechado";
/** Pede ao cabeçalho para abrir a garagem (login / modal / conta). */
export const ABRIR_GARAGEM_EVENT = "accorsi:abrir-garagem";

const VISTA_KEY = "accorsi-garagem-animacao-vista";
const DURACAO_MS = 2400;

const NAVY = "#34456b";
const NAVY_ESCURO = "#26344f";
const LARANJA = "#ff914d";

export const GARAGEM_KEYFRAMES = `
@keyframes accorsi-garagem-porta {
  0%, 22% { transform: translateY(0); }
  34%, 70% { transform: translateY(-104px); }
  84%, 100% { transform: translateY(0); }
}
@keyframes accorsi-garagem-pulo {
  0%, 84% { transform: scale(1); filter: none; }
  91% { transform: scale(1.15) translateY(-2px); filter: drop-shadow(0 0 6px rgba(255,145,77,.9)); }
  100% { transform: scale(1); filter: none; }
}
@keyframes accorsi-garagem-carro-header {
  0% { transform: translateX(var(--carro-inicio)) scaleX(-1); opacity: 0; }
  6% { opacity: 1; }
  60% { transform: translateX(0) scaleX(-1) scale(1); opacity: 1; }
  72%, 100% { transform: translateX(0) scaleX(-1) scale(.55); opacity: 0; }
}
@keyframes accorsi-garagem-texto {
  0%, 6% { clip-path: inset(0 0 0 100%); }
  52%, 100% { clip-path: inset(0 0 0 0); }
}
}
`;

/** Carro lateral (aponta para a direita), em azul-marinho. */
export function CarroSvg({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="38 20 176 114" className={className} style={style} aria-hidden>
      <CarroDesenho />
    </svg>
  );
}

function CarroDesenho() {
  return (
    <g stroke="#08080A" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="118" y1="26" x2="126" y2="36" />
      <polygon points="44,36 66,36 58,49" fill={NAVY_ESCURO} />
      <path
        d="M 66,36 L 128,36 C 138,36 146,41 154,49 L 169,65 L 196,72 C 204,74 209,81 209,89 L 209,112 L 44,112 L 44,76 Z"
        fill={NAVY}
      />
      <polygon points="73,48 101,48 101,71 61,71" fill="#D4EEF9" />
      <polygon points="101,48 134,48 156,71 101,71" fill="#A0D5EC" />
      <polygon points="148,62 156,71 139,71" fill="#D4EEF9" />
      <path d="M 44,77 L 49,77 C 53,77 55,80 55,84 L 55,88 C 55,92 53,95 49,95 L 44,95 Z" fill="#FCF072" />
      <path d="M 192,71 L 196,72 C 204,74 209,81 209,89 L 209,92 L 202,92 C 195,92 192,86 192,79 Z" fill="#FCF072" />
      <path d="M 55,88 C 68,78 88,83 96,97 L 114,97" fill="none" />
      <line x1="127" y1="97" x2="155" y2="97" />
      <line x1="98" y1="83" x2="98.5" y2="83" />
      <line x1="109" y1="83" x2="115" y2="83" />
      <path d="M 156,71 C 163,78 166,81 166,87" fill="none" />
      <line x1="178" y1="83" x2="178.5" y2="83" />
      <circle cx="72" cy="112" r="17" fill="#3B4D59" />
      <circle cx="72" cy="112" r="6.5" fill="#FCF072" />
      <circle cx="180" cy="112" r="17" fill="#3B4D59" />
      <circle cx="180" cy="112" r="6.5" fill="#FCF072" />
    </g>
  );
}

/** Garagem laranja; com `animar`, a porta sobe, espera o carro e fecha. */
export function GaragemSvg({
  className,
  animar,
  chave,
}: {
  className?: string;
  animar?: boolean;
  chave?: number;
}) {
  const clip = useId();
  return (
    <svg viewBox="0 0 240 200" className={className} aria-hidden>
      <GaragemDesenho clipId={clip} animar={animar} chave={chave} />
    </svg>
  );
}

function GaragemDesenho({ clipId, animar, chave }: { clipId: string; animar?: boolean; chave?: number }) {
  return (
    <g strokeLinejoin="round">
      <rect x="20" y="62" width="200" height="123" fill={LARANJA} stroke={NAVY} strokeWidth="9" rx="3" />
      <polygon points="8,64 120,14 232,64" fill={NAVY} stroke={NAVY} strokeWidth="9" />
      {/* interior escuro, visível com a porta aberta */}
      <rect x="48" y="88" width="144" height="97" fill="#ffffff" />
      <clipPath id={clipId}>
        <rect x="48" y="88" width="144" height="97" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <g
          key={chave}
          style={
            animar
              ? { animation: `accorsi-garagem-porta ${DURACAO_MS}ms ease-in-out both` }
              : undefined
          }
        >
          <rect x="48" y="88" width="144" height="97" fill="#ffc29b" />
          {[108, 128, 148, 168].map((y) => (
            <line key={y} x1="48" y1={y} x2="192" y2={y} stroke="#d9702e" strokeWidth="6" />
          ))}
        </g>
      </g>
      <rect x="48" y="88" width="144" height="97" fill="none" stroke={NAVY} strokeWidth="9" />
      <line x1="4" y1="186" x2="236" y2="186" stroke={NAVY} strokeWidth="9" strokeLinecap="round" />
    </g>
  );
}

function reduzMovimento() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Ícone + texto da garagem do cabeçalho. No computador (≥1024px), uma única vez por visitante e
 * depois que o aviso de boas-vindas é fechado, um carrinho atravessa o botão revelando o texto,
 * a porta abre, ele entra e a porta fecha.
 */
export function GaragemIconeCabecalho({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [rodada, setRodada] = useState(0);
  const [pendente, setPendente] = useState(false);
  const [inicio, setInicio] = useState(120);

  useEffect(() => {
    let vista = false;
    try {
      vista = localStorage.getItem(VISTA_KEY) === "1";
    } catch {
      /* sem storage: anima mesmo assim */
    }
    if (vista || reduzMovimento()) return;
    if (!window.matchMedia?.("(min-width: 1024px)").matches) return;

    let timer = 0;
    const pend = window.setTimeout(() => setPendente(true), 0);
    const tocar = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const botao = ref.current?.closest("button");
        const icone = ref.current?.getBoundingClientRect();
        const caixa = botao?.getBoundingClientRect();
        if (icone && caixa) setInicio(Math.max(60, caixa.right - icone.right + 24));
        setRodada((r) => r + 1);
        try {
          localStorage.setItem(VISTA_KEY, "1");
        } catch {
          /* ignore */
        }
      }, 350);
    };

    let avisoAberto = true;
    try {
      avisoAberto = !sessionStorage.getItem("accorsi-aviso-cotacao");
    } catch {
      /* ignore */
    }
    window.addEventListener(AVISO_FECHADO_EVENT, tocar, { once: true });
    if (!avisoAberto) timer = window.setTimeout(tocar, 900);
    return () => {
      window.removeEventListener(AVISO_FECHADO_EVENT, tocar);
      window.clearTimeout(timer);
      window.clearTimeout(pend);
    };
  }, []);

  return (
    <GaragemComTexto
      iconeRef={ref}
      className={className}
      rodada={rodada}
      pendente={pendente}
      inicio={inicio}
      textoClass="hidden xl:contents"
      carroClass="-ml-[13px] h-[17px] w-[26px]"
    >
      {children}
    </GaragemComTexto>
  );
}

/** Garagem + texto; a cada `rodada` o carro vem da direita revelando o texto e entra na garagem. */
function GaragemComTexto({
  iconeRef,
  className,
  children,
  rodada,
  pendente,
  inicio,
  textoClass,
  carroClass,
}: {
  iconeRef: RefObject<HTMLSpanElement | null>;
  className?: string;
  children?: ReactNode;
  rodada: number;
  pendente: boolean;
  inicio: number;
  textoClass: string;
  carroClass: string;
}) {
  const animando = rodada > 0;
  const textoStyle: CSSProperties | undefined = animando
    ? { animation: `accorsi-garagem-texto ${DURACAO_MS}ms cubic-bezier(.45,.05,.35,1) both` }
    : pendente
      ? { clipPath: "inset(0 0 0 100%)" }
      : undefined;

  return (
    <>
      <span ref={iconeRef} className={`relative inline-flex shrink-0 ${className ?? ""}`}>
        <style>{GARAGEM_KEYFRAMES}</style>
        <span
          key={`g${rodada}`}
          className="block h-full w-full"
          style={animando ? { animation: `accorsi-garagem-pulo ${DURACAO_MS}ms ease-out both` } : undefined}
        >
          <GaragemSvg className="h-full w-full" animar={animando} chave={rodada} />
        </span>
        {animando ? (
          <span
            key={`c${rodada}`}
            aria-hidden
            className={`pointer-events-none absolute bottom-[1px] left-1/2 z-10 block ${carroClass}`}
            style={
              {
                "--carro-inicio": `${inicio}px`,
                animation: `accorsi-garagem-carro-header ${DURACAO_MS}ms cubic-bezier(.45,.05,.35,1) both`,
              } as CSSProperties
            }
          >
            <CarroSvg className="h-full w-full drop-shadow-sm" />
          </span>
        ) : null}
      </span>
      {children ? (
        <span key={`t${rodada}`} className="contents">
          <span className={textoClass}>
            <span style={textoStyle} className="block min-w-0">
              {children}
            </span>
          </span>
        </span>
      ) : null}
    </>
  );
}

/**
 * Cartão do aviso no celular: igual ao cabeçalho do PC — o carro vem da direita, o texto surge
 * atrás dele e ele entra na garagem. Roda sempre que o aviso aparece.
 */
export function GaragemCartaoAnimado({ className, children }: { className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [rodada, setRodada] = useState(0);
  const [pendente, setPendente] = useState(false);
  const [inicio, setInicio] = useState(200);

  useEffect(() => {
    if (reduzMovimento()) return;
    const pend = window.setTimeout(() => setPendente(true), 0);
    const t = window.setTimeout(() => {
      const caixa = ref.current?.parentElement?.getBoundingClientRect();
      const icone = ref.current?.getBoundingClientRect();
      if (icone && caixa) setInicio(Math.max(80, caixa.right - icone.right + 10));
      setRodada(1);
    }, 600);
    return () => {
      window.clearTimeout(pend);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <GaragemComTexto
      iconeRef={ref}
      className={className}
      rodada={rodada}
      pendente={pendente}
      inicio={inicio}
      textoClass="contents"
      carroClass="-ml-[17px] h-[22px] w-[34px]"
    >
      {children}
    </GaragemComTexto>
  );
}
