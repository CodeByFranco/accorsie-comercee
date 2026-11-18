import Image from "next/image";
import Link from "next/link";

import { storeShellContent, storeShellInset } from "@/config/storeShell";
import { manifestoBlocks } from "@/features/site-layout/utils/institucional";
import {
  paragrafos,
  safeHref,
  type SobreBloco,
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
  claro: "bg-white text-store-navy",
  cinza: "bg-[#f3f5f9] text-store-navy",
  escuro: "bg-store-navy text-white",
};

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

function ImagemTexto({ b, primeiro }: { b: SobreBlocoImagemTexto; primeiro: boolean }) {
  const escuro = b.fundo === "escuro";
  const Titulo = primeiro ? "h1" : "h2";
  const href = safeHref(b.botao_link);
  return (
    <section className={`py-10 sm:py-14 ${storeShellInset} ${fundoClass[b.fundo]}`}>
      <div
        className={`${storeShellContent} grid items-center gap-8 ${b.imagem_url ? "lg:grid-cols-2" : ""} lg:gap-12`}
      >
        {b.imagem_url ? (
          <div
            className={`relative aspect-[4/3] overflow-hidden rounded-2xl border border-store-line/80 shadow-[0_12px_40px_rgba(52,69,107,0.16)] ${
              b.imagem_lado === "direita" ? "lg:order-2" : ""
            }`}
          >
            <Foto url={b.imagem_url} alt={b.imagem_alt} sizes="(max-width: 1024px) 100vw, 36rem" priority={primeiro} />
          </div>
        ) : null}

        <div>
          {b.etiqueta ? (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-store-accent">{b.etiqueta}</p>
          ) : null}
          {b.titulo ? (
            <Titulo className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{b.titulo}</Titulo>
          ) : null}
          <div
            className={`mt-5 space-y-4 text-sm leading-relaxed sm:text-base ${
              escuro ? "text-white/80" : "text-store-navy-muted"
            }`}
          >
            {paragrafos(b.texto).map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
          {b.botao_texto && href ? (
            <Link
              href={href}
              className={`mt-7 inline-flex rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                escuro ? "bg-white text-store-navy hover:bg-white/90" : "bg-store-navy text-white hover:bg-store-navy/90"
              }`}
            >
              {b.botao_texto}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Pilares({ b }: { b: SobreBlocoPilares }) {
  const escuro = b.fundo === "escuro";
  return (
    <section aria-label={b.titulo || "Destaques"} className={`py-10 sm:py-14 ${storeShellInset} ${fundoClass[b.fundo]}`}>
      <div className={storeShellContent}>
        {b.titulo ? <h2 className="mb-6 text-center text-2xl font-black tracking-tight">{b.titulo}</h2> : null}
        <ul className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-2.5">
          {b.itens.map((item, i) => (
            <li
              key={i}
              className={`flex w-fit max-w-full items-center gap-2 rounded-md border px-3.5 py-2.5 shadow-[0_2px_10px_rgba(52,69,107,0.12)] ${
                escuro ? "border-white/15 bg-white/10" : "border-store-navy/12 bg-[#e8edf5]"
              }`}
            >
              <SobreIconeSvg icone={item.icone} />
              <div className="min-w-0">
                <h3 className="text-xs font-semibold">{item.titulo}</h3>
                {item.texto ? (
                  <p className={`mt-0.5 text-[11px] leading-snug sm:text-xs ${escuro ? "text-white/70" : "text-store-navy/65"}`}>
                    {item.texto}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Manifesto({ b }: { b: SobreBlocoManifesto }) {
  const escuro = b.fundo === "escuro";
  const blocos = manifestoBlocks(b.texto);
  const destaque = blocos[0];
  const fecho = blocos.length > 1 ? blocos[blocos.length - 1] : undefined;
  const meio = blocos.slice(1, fecho ? -1 : undefined);
  const forte = escuro ? "text-white" : "text-store-navy";
  const suave = escuro ? "text-white/80" : "text-store-navy-muted";

  return (
    <section aria-label={b.titulo || "Manifesto"} className={`relative overflow-hidden ${fundoClass[b.fundo]}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-store-accent/60 to-transparent"
      />
      <div className={`relative py-20 sm:py-28 ${storeShellInset}`}>
        <div className={`${storeShellContent} mx-auto max-w-2xl text-center`}>
          {b.titulo ? (
            <>
              <h2 className="text-xs font-bold uppercase tracking-[0.32em] text-store-accent">{b.titulo}</h2>
              <div className="mx-auto mt-5 h-0.5 w-10 rounded-full bg-store-accent" />
            </>
          ) : null}

          {destaque ? (
            <p className="mt-12 text-2xl font-bold leading-snug tracking-tight sm:mt-14 sm:text-[2.1rem] sm:leading-tight">
              {destaque.join(" ")}
            </p>
          ) : null}

          {meio.length ? (
            <div className="mt-14 space-y-14 sm:mt-16 sm:space-y-16">
              {meio.map((bloco, i) => (
                <div key={i} className="space-y-3">
                  {bloco.map((linha, j) => (
                    <p
                      key={j}
                      className={
                        linha.length <= 60
                          ? `text-lg font-semibold leading-relaxed sm:text-xl ${forte}`
                          : `text-base leading-loose sm:text-lg ${suave}`
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
            <div className="mt-16 sm:mt-20">
              <span aria-hidden className="mx-auto block h-1.5 w-1.5 rounded-full bg-store-accent" />
              <div className="mt-10 space-y-2">
                {fecho.map((linha, i) => (
                  <p
                    key={i}
                    className={`text-xl font-bold leading-snug sm:text-2xl ${i === 0 ? "" : "text-store-accent"}`}
                  >
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
  const escuro = b.fundo === "escuro";
  const centro = b.alinhamento === "centro";
  return (
    <section className={`py-10 sm:py-14 ${storeShellInset} ${fundoClass[b.fundo]}`}>
      <div className={`${storeShellContent} ${centro ? "mx-auto max-w-2xl text-center" : "max-w-3xl"}`}>
        {b.titulo ? <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{b.titulo}</h2> : null}
        <div
          className={`mt-4 space-y-4 text-sm leading-relaxed sm:text-base ${escuro ? "text-white/80" : "text-store-navy-muted"}`}
        >
          {paragrafos(b.texto).map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function Galeria({ b }: { b: SobreBlocoGaleria }) {
  if (!b.imagens.length) return null;
  const escuro = b.fundo === "escuro";
  return (
    <section className={`py-10 sm:py-14 ${storeShellInset} ${fundoClass[b.fundo]}`}>
      <div className={storeShellContent}>
        {b.titulo ? <h2 className="mb-6 text-2xl font-black tracking-tight sm:text-3xl">{b.titulo}</h2> : null}
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {b.imagens.map((img, i) => (
            <li key={i}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-store-line/80">
                <Foto url={img.url} alt={img.legenda} sizes="(max-width: 1024px) 50vw, 24rem" />
              </div>
              {img.legenda ? (
                <p className={`mt-2 text-xs sm:text-sm ${escuro ? "text-white/70" : "text-store-navy-muted"}`}>
                  {img.legenda}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
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
          case "imagem_texto":
            return <ImagemTexto key={b.id} b={b} primeiro={i === 0} />;
          case "pilares":
            return <Pilares key={b.id} b={b} />;
          case "manifesto":
            return <Manifesto key={b.id} b={b} />;
          case "texto":
            return <Texto key={b.id} b={b} />;
          case "galeria":
            return <Galeria key={b.id} b={b} />;
        }
      })}
    </>
  );
}
