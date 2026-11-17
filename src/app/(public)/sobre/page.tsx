import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { storeShellContent, storeShellInset } from "@/config/storeShell";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const iconClass = "h-5 w-5 shrink-0 text-store-accent";

export const metadata: Metadata = {
  title: "Quem somos | Accorsi Auto Peças",
  description:
    "A Accorsi Auto Peças atua desde 2016 na reposição de peças automotivas. Empresa familiar, com origem no segmento de auto elétrica.",
};

const PILARES: Array<{ icone: ReactNode; titulo: string; texto: string }> = [
  {
    icone: (
      <svg {...iconProps} className={iconClass}>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    titulo: "Segurança na escolha",
    texto: "A peça certa para quem depende do carro no dia a dia.",
  },
  {
    icone: (
      <svg {...iconProps} className={iconClass}>
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    titulo: "Agilidade no atendimento",
    texto: "Resposta rápida quando o serviço não pode esperar.",
  },
  {
    icone: (
      <svg {...iconProps} className={iconClass}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    titulo: "Confiança em cada solução",
    texto: "Experiência de quem vive o setor automotivo desde 2016.",
  },
];

export default function SobrePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-store-navy">
      <main>
        <section className={`py-10 sm:py-14 ${storeShellInset}`}>
          <div className={`${storeShellContent} grid items-center gap-8 lg:grid-cols-2 lg:gap-12`}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-store-line/80 shadow-[0_12px_40px_rgba(52,69,107,0.16)]">
              <Image
                src="/sobre/loja.jpg"
                alt="Fachada da Accorsi Auto Peças"
                fill
                priority
                className="object-cover object-[center_35%]"
                sizes="(max-width: 1024px) 100vw, 36rem"
              />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-store-accent">Desde 2016</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-store-navy sm:text-4xl">Quem somos</h1>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-store-navy-muted sm:text-base">
                <p>
                  Com origem no segmento de auto elétrica, a Accorsi Auto Peças atua no mercado desde 2016, com foco
                  na reposição de peças automotivas, construída na vivência do dia a dia do setor e na leitura precisa
                  das necessidades de quem depende do serviço.
                </p>
                <p>Somos uma empresa familiar, com sólida experiência no ramo automotivo.</p>
              </div>
              <Link
                href="/produtos"
                className="mt-7 inline-flex rounded-lg bg-store-navy px-4 py-2.5 text-sm font-bold text-white transition hover:bg-store-navy/90"
              >
                Ver produtos
              </Link>
            </div>
          </div>
        </section>

        <section aria-label="O que entregamos" className={`bg-white pb-10 sm:pb-14 ${storeShellInset}`}>
          <ul className={`${storeShellContent} flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-2.5`}>
            {PILARES.map((item) => (
              <li
                key={item.titulo}
                className="flex w-fit max-w-full items-center gap-2 rounded-md border border-store-navy/12 bg-[#e8edf5] px-3.5 py-2.5 shadow-[0_2px_10px_rgba(52,69,107,0.12)]"
              >
                {item.icone}
                <div className="min-w-0">
                  <h2 className="text-xs font-semibold text-store-navy">{item.titulo}</h2>
                  <p className="mt-0.5 text-[11px] leading-snug text-store-navy/65 sm:text-xs">{item.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="relative overflow-hidden bg-store-navy text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-2 -top-8 select-none font-serif text-[10rem] leading-none text-white/10 sm:left-6 sm:top-0 sm:text-[14rem]"
          >
            “
          </div>
          <div className={`relative py-16 sm:py-20 ${storeShellInset}`}>
            <div className={`${storeShellContent} mx-auto max-w-3xl text-center`}>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-store-accent">Manifesto</p>
              <div className="mx-auto mt-4 h-0.5 w-12 rounded-full bg-store-accent" />
              <blockquote className="mt-6 text-2xl font-semibold leading-snug sm:text-[2rem] sm:leading-snug">
                Mais do que fornecer peças, nosso papel é dar segurança na escolha, agilidade no atendimento e
                confiança em cada solução entregue.
              </blockquote>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
