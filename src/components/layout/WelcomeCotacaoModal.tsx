"use client";

import Image from "next/image";
import { Poppins } from "next/font/google";
import { useCallback, useEffect, useState } from "react";

import { ABRIR_COTACAO_EVENT } from "@/components/layout/WhatsAppAssistantButton";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

const STORAGE_KEY = "accorsi-aviso-cotacao";
/** "fechado" = escondido nesta visita. */
type Estado = "oculto" | "aberto";

const CONTATOS = [
  { label: "Vendas 1", numero: "(54) 99934-3052", href: "https://wa.me/5554999343052" },
  { label: "Vendas 2", numero: "(54) 99604-5322", href: "https://wa.me/5554996045322" },
];

const FALA_TITULO = "Procurando uma peça? Nosso time encontra para você!";
const FALA_TEXTO = "Conte com nosso time de vendas para encontrar a peça certa! Solicite sua cotação pelo WhatsApp.";
const FALA_TOTAL = FALA_TITULO.length + FALA_TEXTO.length;

/** Aviso ao abrir o site (uma vez por sessão): a assistente "fala" e oferece a cotação pelo WhatsApp. */
export function WelcomeCotacaoModal() {
  const [estado, setEstado] = useState<Estado>("oculto");
  const [chars, setChars] = useState(0);
  const [geracao, setGeracao] = useState(0);
  const open = estado === "aberto";

  const abrir = useCallback(() => {
    setChars(0);
    setEstado("aberto");
    setGeracao((g) => g + 1);
  }, []);

  const fechar = useCallback(() => {
    setEstado("oculto");
    try {
      sessionStorage.setItem(STORAGE_KEY, "fechado");
    } catch {
      /* ignore */
    }
  }, []);


  useEffect(() => {
    let salvo: string | null = null;
    try {
      salvo = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage bloqueado: mostra mesmo assim */
    }
    if (salvo) return;
    const t = window.setTimeout(() => setEstado("aberto"), 600);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    window.addEventListener(ABRIR_COTACAO_EVENT, abrir);
    return () => window.removeEventListener(ABRIR_COTACAO_EVENT, abrir);
  }, [abrir]);

  // Efeito de digitação (a assistente "falando"); sem animação se o usuário preferir menos movimento.
  useEffect(() => {
    if (!open) return;
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduz) {
      const t = window.setTimeout(() => setChars(FALA_TOTAL), 0);
      return () => window.clearTimeout(t);
    }
    const id = window.setInterval(() => {
      setChars((c) => {
        if (c >= FALA_TOTAL) {
          window.clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, 28);
    return () => window.clearInterval(id);
  }, [open, geracao]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, fechar]);

  if (estado === "oculto") return null;

  const falando = chars < FALA_TOTAL;
  const titulo = FALA_TITULO.slice(0, chars);
  const texto = FALA_TEXTO.slice(0, Math.max(0, chars - FALA_TITULO.length));

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-4"
      onClick={fechar}
      role="presentation"
    >
      <style>{`
        @keyframes accorsi-falar {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(-1.2deg); }
          100% { transform: translateY(0) rotate(0.6deg); }
        }
        @keyframes accorsi-cursor { 50% { opacity: 0; } }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-cotacao-titulo"
        aria-describedby="aviso-cotacao-texto"
        onClick={(e) => e.stopPropagation()}
        className={`${poppins.className} relative w-full max-w-[26rem] overflow-hidden rounded-3xl border-[3px] border-store-accent bg-white text-store-navy shadow-2xl`}
      >
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar aviso"
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-white/90 transition hover:bg-white/15"
        >
          ×
        </button>

        {/* Assistente + balão de fala */}
        <div className="flex items-stretch gap-1 bg-store-navy px-3 pt-10">
          <div
            className="relative z-[1] mt-auto h-[150px] w-[112px] shrink-0 origin-bottom"
            style={falando ? { animation: "accorsi-falar 0.32s ease-in-out infinite alternate" } : undefined}
          >
            <Image
              src="/icons/assistente.png"
              alt="Assistente da Accorsi"
              fill
              sizes="112px"
              className="object-cover object-top"
              priority
            />
          </div>

          <div className="relative -ml-4 mb-auto mt-1 min-h-[118px] flex-1 self-start rounded-2xl border-2 border-store-accent bg-white px-3.5 py-2.5 shadow-md">
            {/* rabinho do balão saindo da boca da assistente */}
            <span
              aria-hidden
              className="absolute -left-[9px] top-[38px] h-4 w-4 rotate-45 border-b-2 border-l-2 border-store-accent bg-white"
            />
            {/* texto completo para leitores de tela; o animado é só visual */}
            <h2 id="aviso-cotacao-titulo" className="sr-only">
              {FALA_TITULO}
            </h2>
            <p id="aviso-cotacao-texto" className="sr-only">
              {FALA_TEXTO}
            </p>
            <div aria-hidden className="relative">
              <p className="text-[15px] font-extrabold leading-snug text-store-navy">
                {titulo}
                {chars <= FALA_TITULO.length && falando ? <Cursor /> : null}
              </p>
              <p className="mt-1 text-[13px] leading-snug text-store-navy/85">
                {texto}
                {chars > FALA_TITULO.length && falando ? <Cursor /> : null}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 pb-4 pt-3.5">
          <p className="text-center text-sm font-bold text-store-navy">
            Escolha um de nossos vendedores e faça sua cotação!
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CONTATOS.map((c) => (
              <a
                key={c.href}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={fechar}
                className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-3 py-2 text-store-navy shadow-sm transition hover:brightness-95"
              >
                <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0 fill-current">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91A9.86 9.86 0 0 0 12.04 2Zm5.8 14.1c-.24.68-1.41 1.3-1.95 1.38-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.14-.2-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.2-.14.31-.29.49-.14.17-.3.38-.43.5-.14.15-.29.3-.12.6.17.29.75 1.24 1.61 2 1.1.98 2.04 1.29 2.33 1.43.29.15.46.12.63-.07.17-.2.73-.85.92-1.14.2-.29.39-.24.66-.15.27.1 1.7.8 1.99.95.29.14.48.22.55.34.07.12.07.7-.17 1.38Z" />
                </svg>
                <span className="flex flex-col leading-tight">
                  <span className="text-sm font-bold">{c.label}</span>
                  <span className="text-[11px] font-semibold opacity-90">{c.numero}</span>
                </span>
              </a>
            ))}
          </div>

          <p className="text-center text-xs font-semibold italic text-store-navy">
            Accorsi Auto Peças, <span className="text-store-accent">sua solução está aqui!</span>
          </p>

          <button
          type="button"
          onClick={fechar}
          className="w-full rounded-full bg-store-navy px-4 py-2 text-center text-xs font-semibold text-white transition hover:brightness-110"
        >
          Continuar navegando
        </button>
        </div>
      </div>
    </div>
  );
}

function Cursor() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-store-accent"
      style={{ animation: "accorsi-cursor 0.8s steps(1) infinite" }}
    />
  );
}
