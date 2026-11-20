import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { storeShellContent, storeShellInset } from "@/config/storeShell";
import { manifestoBlocks } from "@/features/site-layout/utils/institucional";
import {
  fundoEscuro,
  paragrafos,
  safeHref,
  type SobreBloco,
  type SobreBlocoCapa,
  type SobreBlocoChamada,
  type SobreBlocoLinhaTempo,
  type SobreBlocoGaleria,
  type SobreBlocoImagemTexto,
  type SobreBlocoManifesto,
  type SobreBlocoPilares,
  type SobreBlocoTexto,
  type SobreFundo,
  type SobreIcone,
} from "@/features/site-layout/utils/sobreBlocos";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "h-5 w-5 shrink-0 text-store-accent",
} as const;

export function SobreIconeSvg({ icone }: { icone: SobreIcone }) {
  switch (icone) {
    case "escudo":
      return (
        <svg {...iconProps}>
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "raio":
      return (
        <svg {...iconProps}>
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case "pessoas":
      return (
        <svg {...iconProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "estrela":
      return (
        <svg {...iconProps}>
          <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
        </svg>
      );
    case "chave":
      return (
        <svg {...iconProps}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />
        </svg>
      );
    case "carro":
      return (
        <svg {...iconProps}>
          <path d="M5 11l1.5-4h11L19 11M5 11h14v5H5v-5z" />
          <circle cx="7.5" cy="16" r="1.5" />
          <circle cx="16.5" cy="16" r="1.5" />
        </svg>
      );
    case "relogio":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "coracao":
      return (
        <svg {...iconProps}>
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
        </svg>
      );
  }
}

const fundoClass: Record<SobreFundo, string> = {
  claro: "bg-white text-store-ink",
  creme: "bg-store-sand text-store-ink",
  cinza: "bg-[#f3f5f9] text-store-ink",
  escuro: "bg-store-ink text-white",
  personalizado: "",
};

function fundoProps(b: SobreBloco): { className: string; style?: CSSProperties } {
  if (b.fundo !== "personalizado") return { className: fundoClass[b.fundo] };
  return {
    className: fundoEscuro(b) ? "text-white" : "text-store-ink",
    style: { backgroundColor: b.fundo_cor },
  };
}

/** Espaçamento generoso e largura de leitura das seções editoriais. */
const secao = `py-20 sm:py-28 ${storeShellInset}`;
const tituloSerif = "font-serif font-normal leading-[1.08] tracking-tight";

function Etiqueta({ texto, escuro }: { texto: string; escuro: boolean }) {
  if (!texto) return null;
  return (
    <p
      className={`flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] ${
        escuro ? "text-white/60" : "text-store-ink/55"
      }`}
    >
      <span aria-hidden className="h-px w-8 bg-store-accent" />
      {texto}
    </p>
  );
}

function Botao({ texto, link, variante }: { texto: string; link: string; variante: "cheio" | "contorno" }) {
  const href = safeHref(link);
  if (!texto || !href) return null;
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
        variante === "cheio"
          ? "bg-store-accent text-white hover:bg-[#f07f38]"
          : "border border-current hover:bg-white hover:text-store-ink"
      }`}
    >
      {texto}
      <span aria-hidden>→</span>
    </Link>
  );
}

function Foto({ url, alt, sizes, priority }: { url: string; alt: string; sizes: string; priority?: boolean }) {
  return (
    <Image
      src={url}
      alt={alt}
      fill
      priority={priority}
      unoptimized={!url.startsWith("/")}
      className="object-cover object-[center_35%]"
      sizes={sizes}
    />
  );
}

function Paragrafos({ texto, escuro, className = "" }: { texto: string; escuro: boolean; className?: string }) {
  const ps = paragrafos(texto);
  if (!ps.length) return null;
  return (
    <div className={`space-y-5 text-base leading-[1.8] ${escuro ? "text-white/75" : "text-store-ink/70"} ${className}`}>
      {ps.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}

function Capa({ b, primeiro }: { b: SobreBlocoCapa; primeiro: boolean }) {
  const Titulo = primeiro ? "h1" : "h2";
  return (
    <section className={`relative isolate overflow-hidden bg-store-ink text-white ${storeShellInset}`}>
      {b.imagem_url ? (
        <>
          <Foto url={b.imagem_url} alt={b.imagem_alt} sizes="100vw" priority={primeiro} />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-store-ink via-store-ink/85 to-store-ink/40"
          />
        </>
      ) : null}
      <div className={`${storeShellContent} relative flex min-h-[32rem] flex-col justify-center py-24 sm:min-h-[38rem]`}>
        <div className="max-w-2xl">
          <Etiqueta texto={b.etiqueta} escuro />
          <Titulo className={`${tituloSerif} mt-6 text-5xl uppercase tracking-[0.04em] sm:text-6xl lg:text-7xl`}>
            {b.titulo}
          </Titulo>
          {b.texto ? <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/80">{b.texto}</p> : null}
          {b.botao_texto ? (
            <div className="mt-10">
              <Botao texto={b.botao_texto} link={b.botao_link} variante="cheio" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ImagemTexto({ b, primeiro }: { b: SobreBlocoImagemTexto; primeiro: boolean }) {
  const fp = fundoProps(b);
  const escuro = fundoEscuro(b);
  const Titulo = primeiro ? "h1" : "h2";
  return (
    <section className={`${secao} ${fp.className}`} style={fp.style}>
      <div
        className={`${storeShellContent} grid items-center gap-12 ${b.imagem_url ? "lg:grid-cols-2" : ""} lg:gap-20`}
      >
        {b.imagem_url ? (
          <div className={`relative aspect-[4/5] overflow-hidden sm:aspect-[4/3] lg:aspect-[4/5] ${b.imagem_lado === "direita" ? "lg:order-2" : ""}`}>
            <Foto url={b.imagem_url} alt={b.imagem_alt} sizes="(max-width: 1024px) 100vw, 36rem" priority={primeiro} />
          </div>
        ) : null}

        <div className="max-w-xl">
          <Etiqueta texto={b.etiqueta} escuro={escuro} />
          {b.titulo ? <Titulo className={`${tituloSerif} mt-5 text-4xl sm:text-5xl`}>{b.titulo}</Titulo> : null}
          <Paragrafos texto={b.texto} escuro={escuro} className="mt-8" />
          {b.botao_texto ? (
            <div className="mt-10">
              <Botao texto={b.botao_texto} link={b.botao_link} variante={escuro ? "cheio" : "contorno"} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Pilares({ b }: { b: SobreBlocoPilares }) {
  const fp = fundoProps(b);
  const escuro = fundoEscuro(b);
  return (
    <section aria-label={b.titulo || "Destaques"} className={`${secao} ${fp.className}`} style={fp.style}>
      <div className={storeShellContent}>
        {b.etiqueta || b.titulo || b.texto ? (
          <div className="max-w-2xl">
            <Etiqueta texto={b.etiqueta} escuro={escuro} />
            {b.titulo ? <h2 className={`${tituloSerif} mt-5 text-4xl sm:text-5xl`}>{b.titulo}</h2> : null}
            <Paragrafos texto={b.texto} escuro={escuro} className="mt-6" />
          </div>
        ) : null}
        <ul
          className={`mt-14 grid gap-px sm:grid-cols-2 ${
            b.itens.length >= 4 ? "lg:grid-cols-4" : b.itens.length === 3 ? "lg:grid-cols-3" : ""
          } ${
            escuro ? "bg-white/10" : "bg-store-ink/10"
          }`}
        >
          {b.itens.map((item, i) => (
            <li key={i} className={`p-8 ${escuro ? "bg-store-ink" : fundoClass.creme}`}>
              <SobreIconeSvg icone={item.icone} />
              <h3 className="mt-6 font-serif text-2xl font-normal">{item.titulo}</h3>
              {item.texto ? (
                <p className={`mt-3 text-sm leading-relaxed ${escuro ? "text-white/65" : "text-store-ink/65"}`}>
                  {item.texto}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function LinhaTempo({ b }: { b: SobreBlocoLinhaTempo }) {
  const fp = fundoProps(b);
  const escuro = fundoEscuro(b);
  if (!b.itens.length) return null;
  return (
    <section aria-label={b.titulo || "Linha do tempo"} className={`${secao} ${fp.className}`} style={fp.style}>
      <div className={storeShellContent}>
        <div className="max-w-2xl">
          <Etiqueta texto={b.etiqueta} escuro={escuro} />
          {b.titulo ? <h2 className={`${tituloSerif} mt-5 text-4xl sm:text-5xl`}>{b.titulo}</h2> : null}
          <Paragrafos texto={b.texto} escuro={escuro} className="mt-6" />
        </div>
        <ol className="relative mt-16 grid gap-12 md:grid-flow-col md:auto-cols-fr md:gap-8">
          <span
            aria-hidden
            className={`absolute left-0 right-0 top-[4.25rem] hidden h-px md:block ${escuro ? "bg-white/20" : "bg-store-ink/15"}`}
          />
          {b.itens.map((it, i) => (
            <li key={i} className="relative">
              <span className={`${tituloSerif} block h-12 text-5xl text-store-accent`}>{it.ano}</span>
              <span
                aria-hidden
                className="relative mt-5 hidden h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-store-accent md:block"
              />
              <h3 className="mt-5 font-serif text-xl font-normal">{it.titulo}</h3>
              {it.texto ? (
                <p className={`mt-2 text-sm leading-relaxed ${escuro ? "text-white/65" : "text-store-ink/65"}`}>{it.texto}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Manifesto({ b }: { b: SobreBlocoManifesto }) {
  const fp = fundoProps(b);
  const escuro = fundoEscuro(b);
  const blocos = manifestoBlocks(b.texto);
  const destaque = blocos[0];
  const fecho = blocos.length > 1 ? blocos[blocos.length - 1] : undefined;
  const meio = blocos.slice(1, fecho ? -1 : undefined);
  const forte = escuro ? "text-white" : "text-store-ink";
  const suave = escuro ? "text-white/70" : "text-store-ink/70";

  return (
    <section aria-label={b.titulo || "Manifesto"} className={`relative overflow-hidden ${fp.className}`} style={fp.style}>
      <div className={`relative py-24 sm:py-32 ${storeShellInset}`}>
        <div className={`${storeShellContent} mx-auto max-w-3xl text-center`}>
          {b.titulo ? (
            <h2 className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-store-accent">
              <span aria-hidden className="h-px w-8 bg-store-accent" />
              {b.titulo}
              <span aria-hidden className="h-px w-8 bg-store-accent" />
            </h2>
          ) : null}

          {destaque ? (
            <p className={`${tituloSerif} mt-12 text-4xl sm:mt-14 sm:text-5xl`}>{destaque.join(" ")}</p>
          ) : null}

          {meio.length ? (
            <div className="mt-16 space-y-14 sm:mt-20 sm:space-y-16">
              {meio.map((bloco, i) => (
                <div key={i} className="space-y-3">
                  {bloco.map((linha, j) => (
                    <p
                      key={j}
                      className={
                        linha.length <= 60
                          ? `font-serif text-2xl leading-snug ${forte}`
                          : `text-base leading-[1.9] sm:text-lg ${suave}`
                      }
                    >
                      {linha}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          {fecho ? (
            <div className="mt-20 sm:mt-24">
              <span aria-hidden className="mx-auto block h-1.5 w-1.5 rounded-full bg-store-accent" />
              <div className="mt-10 space-y-2">
                {fecho.map((linha, i) => (
                  <p key={i} className={`font-serif text-3xl leading-snug sm:text-4xl ${i === 0 ? "" : "text-store-accent"}`}>
                    {linha}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Texto({ b }: { b: SobreBlocoTexto }) {
  const fp = fundoProps(b);
  const escuro = fundoEscuro(b);
  const centro = b.alinhamento === "centro";
  return (
    <section className={`${secao} ${fp.className}`} style={fp.style}>
      <div className={`${storeShellContent} ${centro ? "mx-auto max-w-2xl text-center" : "max-w-3xl"}`}>
        {b.titulo ? <h2 className={`${tituloSerif} text-4xl sm:text-5xl`}>{b.titulo}</h2> : null}
        <Paragrafos texto={b.texto} escuro={escuro} className="mt-8" />
      </div>
    </section>
  );
}

function Galeria({ b }: { b: SobreBlocoGaleria }) {
  const fp = fundoProps(b);
  if (!b.imagens.length) return null;
  const escuro = fundoEscuro(b);
  return (
    <section className={`${secao} ${fp.className}`} style={fp.style}>
      <div className={storeShellContent}>
        <Etiqueta texto={b.etiqueta} escuro={escuro} />
        {b.titulo ? <h2 className={`${tituloSerif} mt-5 text-4xl sm:text-5xl`}>{b.titulo}</h2> : null}
        <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {b.imagens.map((img, i) => (
            <li key={i} className={i === 0 ? "col-span-2 row-span-2" : ""}>
              <div className={`relative overflow-hidden ${i === 0 ? "aspect-square" : "aspect-[4/3] lg:aspect-square"}`}>
                <Foto url={img.url} alt={img.legenda} sizes="(max-width: 1024px) 50vw, 24rem" />
              </div>
              {img.legenda ? (
                <p className={`mt-2 text-xs ${escuro ? "text-white/60" : "text-store-ink/60"}`}>{img.legenda}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Chamada({ b }: { b: SobreBlocoChamada }) {
  const fp = fundoProps(b);
  const escuro = b.imagem_url ? true : fundoEscuro(b);
  return (
    <section
      className={`relative isolate overflow-hidden ${b.imagem_url ? "bg-store-ink text-white" : fp.className} ${storeShellInset}`}
      style={b.imagem_url ? undefined : fp.style}
    >
      {b.imagem_url ? (
        <>
          <Foto url={b.imagem_url} alt="" sizes="100vw" />
          <div aria-hidden className="absolute inset-0 bg-store-ink/80" />
        </>
      ) : null}
      <div className={`${storeShellContent} relative mx-auto max-w-2xl py-24 text-center sm:py-28`}>
        {b.titulo ? <h2 className={`${tituloSerif} text-4xl sm:text-5xl`}>{b.titulo}</h2> : null}
        {b.texto ? (
          <p className={`mt-6 text-lg leading-relaxed ${escuro ? "text-white/75" : "text-store-ink/70"}`}>{b.texto}</p>
        ) : null}
        {b.botao_texto ? (
          <div className="mt-10">
            <Botao texto={b.botao_texto} link={b.botao_link} variante="cheio" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function SobreBlocosView({ blocos }: { blocos: SobreBloco[] }) {
  const visiveis = blocos.filter((b) => b.visivel);
  return (
    <>
      {visiveis.map((b, i) => {
        switch (b.tipo) {
          case "capa":
            return <Capa key={b.id} b={b} primeiro={i === 0} />;
          case "imagem_texto":
            return <ImagemTexto key={b.id} b={b} primeiro={i === 0} />;
          case "pilares":
            return <Pilares key={b.id} b={b} />;
          case "linha_tempo":
            return <LinhaTempo key={b.id} b={b} />;
          case "manifesto":
            return <Manifesto key={b.id} b={b} />;
          case "texto":
            return <Texto key={b.id} b={b} />;
          case "galeria":
            return <Galeria key={b.id} b={b} />;
          case "chamada":
            return <Chamada key={b.id} b={b} />;
        }
      })}
    </>
  );
}
