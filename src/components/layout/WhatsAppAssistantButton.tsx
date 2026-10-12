"use client";

import Image from "next/image";
import { useCallback } from "react";

const WHATSAPP_URL = "https://wa.me/5554999343052";

/** Largura/altura do quadro (PNG 408×439). Altura menor que 439 = recorte inferior, plano médio tipo “até a cintura”. */
const ASSISTENTE_FRAME_W = 350;
const ASSISTENTE_FRAME_H = 340;

export function WhatsAppAssistantButton() {
  const openWhatsApp = useCallback(() => {
    if (typeof window !== "undefined") {
      window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer");
    }
  }, []);

  return (
    <button
      type="button"
      onClick={openWhatsApp}
      className="fixed bottom-[env(safe-area-inset-bottom,0px)] right-0 z-[160] flex flex-col items-end transition hover:scale-[1.02]"
      aria-label="Falar com atendimento no WhatsApp"
    >
      <span className="mb-0.5 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold leading-none text-store-navy shadow-[0_4px_18px_rgba(0,0,0,0.18)] sm:hidden">
        Posso te ajudar?
      </span>
      <span
        className="relative w-[5rem] overflow-hidden sm:hidden"
        style={{ aspectRatio: `${ASSISTENTE_FRAME_W} / ${ASSISTENTE_FRAME_H}` }}
      >
        <Image
          src="/icons/assistente.png"
          alt="Assistente virtual da Accorsi"
          sizes="80px"
          className="object-cover object-top drop-shadow-[0_8px_22px_rgba(0,0,0,0.22)]"
          fill
        />
      </span>

      <span className="hidden w-[9.5rem] flex-col items-end sm:flex">
        <span className="mb-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-store-navy shadow-[0_4px_18px_rgba(0,0,0,0.18)]">
          Posso te ajudar?
        </span>
        <span
          className="relative w-[9.5rem] overflow-hidden"
          style={{ aspectRatio: `${ASSISTENTE_FRAME_W} / ${ASSISTENTE_FRAME_H}` }}
        >
          <Image
            src="/icons/assistente.png"
            alt="Assistente virtual da Accorsi"
            sizes="152px"
            className="object-cover object-top drop-shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
            fill
          />
        </span>
      </span>
    </button>
  );
}
