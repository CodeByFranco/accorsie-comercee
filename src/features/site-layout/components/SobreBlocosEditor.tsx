"use client";

import { useState, useTransition, type ReactNode } from "react";

import { SobreBlocosView } from "@/features/site-layout/components/SobreBlocosView";
import { saveSobreBlocos } from "@/features/site-layout/services/saveSobreBlocos";
import {
  defaultSobreBlocos,
  novoBloco,
  novoId,
  SOBRE_FUNDOS,
  SOBRE_ICONES,
  SOBRE_TIPOS,
  type SobreBloco,
  type SobreBlocoTipo,
  type SobreFundo,
  type SobreIcone,
} from "@/features/site-layout/utils/sobreBlocos";
import { uploadSiteBannerFile } from "@/services/storage/uploadSiteBanner";

const field =
  "mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20";
const btnGhost =
  "rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40";

function Campo({ label, dica, children }: { label: string; dica?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      {dica ? <span className="block text-[11px] text-gray-500">{dica}</span> : null}
      {children}
    </label>
  );
}

function ImagemUpload({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-[10px] text-gray-400">sem foto</span>
        )}
      </div>
      <div className="space-y-1">
        <label className={`${btnGhost} inline-block cursor-pointer`}>
          {busy ? "Enviando…" : url ? "Trocar foto" : "Enviar foto"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              setErro(null);
              try {
                onChange(await uploadSiteBannerFile(file));
              } catch (err) {
                setErro(err instanceof Error ? err.message : "Falha no envio.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {url ? (
          <button type="button" className={`${btnGhost} ml-1`} onClick={() => onChange("")}>
            Remover
          </button>
        ) : null}
        {erro ? <p className="text-xs text-red-600">{erro}</p> : null}
      </div>
    </div>
  );
}

function EditorBloco({ b, set }: { b: SobreBloco; set: (b: SobreBloco) => void }) {
  const fundo = (
    <Campo label="Fundo">
      <select className={field} value={b.fundo} onChange={(e) => set({ ...b, fundo: e.target.value as SobreFundo })}>
        {SOBRE_FUNDOS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      {b.fundo === "personalizado" ? (
        <span className="mt-2 flex items-center gap-2">
          <input
            type="color"
            className="h-9 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
            value={b.fundo_cor ?? "#ffffff"}
            onChange={(e) => set({ ...b, fundo_cor: e.target.value })}
            aria-label="Cor do fundo"
          />
          <span className="font-mono text-xs text-gray-600">{b.fundo_cor ?? "#ffffff"}</span>
        </span>
      ) : null}
    </Campo>
  );

  switch (b.tipo) {
    case "capa":
      return (
        <div className="space-y-3">
          <Campo label="Foto de fundo" dica="Fica escurecida por trás do texto.">
            <ImagemUpload url={b.imagem_url} onChange={(imagem_url) => set({ ...b, imagem_url })} />
          </Campo>
          <Campo label="Descrição da foto">
            <input className={field} value={b.imagem_alt} onChange={(e) => set({ ...b, imagem_alt: e.target.value })} />
          </Campo>
          <Campo label="Texto pequeno acima do título">
            <input className={field} value={b.etiqueta} onChange={(e) => set({ ...b, etiqueta: e.target.value })} />
          </Campo>
          <Campo label="Título">
            <input className={field} value={b.titulo} onChange={(e) => set({ ...b, titulo: e.target.value })} />
          </Campo>
          <Campo label="Texto">
            <textarea rows={3} className={field} value={b.texto} onChange={(e) => set({ ...b, texto: e.target.value })} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Botão (texto)" dica="Vazio = sem botão.">
              <input className={field} value={b.botao_texto} onChange={(e) => set({ ...b, botao_texto: e.target.value })} />
            </Campo>
            <Campo label="Botão (link)">
              <input className={field} value={b.botao_link} onChange={(e) => set({ ...b, botao_link: e.target.value })} />
            </Campo>
          </div>
        </div>
      );

    case "linha_tempo":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Texto pequeno acima do título">
              <input className={field} value={b.etiqueta} onChange={(e) => set({ ...b, etiqueta: e.target.value })} />
            </Campo>
            {fundo}
          </div>
          <Campo label="Título">
            <input className={field} value={b.titulo} onChange={(e) => set({ ...b, titulo: e.target.value })} />
          </Campo>
          <Campo label="Introdução (opcional)">
            <input className={field} value={b.texto} onChange={(e) => set({ ...b, texto: e.target.value })} />
          </Campo>
          {b.itens.map((it, i) => {
            const setItem = (patch: Partial<typeof it>) =>
              set({ ...b, itens: b.itens.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={i} className="grid gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-[6rem_1fr_auto]">
                <input className={field} placeholder="Ano" value={it.ano} onChange={(e) => setItem({ ano: e.target.value })} />
                <div className="space-y-2">
                  <input className={field} placeholder="Marco" value={it.titulo} onChange={(e) => setItem({ titulo: e.target.value })} />
                  <input className={field} placeholder="Frase curta" value={it.texto} onChange={(e) => setItem({ texto: e.target.value })} />
                </div>
                <button
                  type="button"
                  className={`${btnGhost} self-start`}
                  onClick={() => set({ ...b, itens: b.itens.filter((_, j) => j !== i) })}
                >
                  Remover
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className={btnGhost}
            onClick={() => set({ ...b, itens: [...b.itens, { ano: "", titulo: "", texto: "" }] })}
          >
            + Adicionar marco
          </button>
        </div>
      );

    case "chamada":
      return (
        <div className="space-y-3">
          <Campo label="Foto de fundo (opcional)" dica="Sem foto, usa a cor de fundo.">
            <ImagemUpload url={b.imagem_url} onChange={(imagem_url) => set({ ...b, imagem_url })} />
          </Campo>
          {b.imagem_url ? null : fundo}
          <Campo label="Título">
            <input className={field} value={b.titulo} onChange={(e) => set({ ...b, titulo: e.target.value })} />
          </Campo>
          <Campo label="Texto">
            <input className={field} value={b.texto} onChange={(e) => set({ ...b, texto: e.target.value })} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Botão (texto)">
              <input className={field} value={b.botao_texto} onChange={(e) => set({ ...b, botao_texto: e.target.value })} />
            </Campo>
            <Campo label="Botão (link)">
              <input className={field} value={b.botao_link} onChange={(e) => set({ ...b, botao_link: e.target.value })} />
            </Campo>
          </div>
        </div>
      );

    case "imagem_texto":
      return (
        <div className="space-y-3">
          <ImagemUpload url={b.imagem_url} onChange={(imagem_url) => set({ ...b, imagem_url })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Lado da foto">
              <select
                className={field}
                value={b.imagem_lado}
                onChange={(e) => set({ ...b, imagem_lado: e.target.value as "esquerda" | "direita" })}
              >
                <option value="esquerda">Esquerda</option>
                <option value="direita">Direita</option>
              </select>
            </Campo>
            {fundo}
          </div>
          <Campo label="Descrição da foto" dica="Para leitores de tela e Google.">
            <input className={field} value={b.imagem_alt} onChange={(e) => set({ ...b, imagem_alt: e.target.value })} />
          </Campo>
          <Campo label="Texto pequeno acima do título" dica="Ex.: Desde 2016. Pode deixar vazio.">
            <input className={field} value={b.etiqueta} onChange={(e) => set({ ...b, etiqueta: e.target.value })} />
          </Campo>
          <Campo label="Título">
            <input className={field} value={b.titulo} onChange={(e) => set({ ...b, titulo: e.target.value })} />
          </Campo>
          <Campo label="Texto" dica="Linha em branco separa parágrafos.">
            <textarea rows={6} className={field} value={b.texto} onChange={(e) => set({ ...b, texto: e.target.value })} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Botão (texto)" dica="Vazio = sem botão.">
              <input
                className={field}
                value={b.botao_texto}
                onChange={(e) => set({ ...b, botao_texto: e.target.value })}
              />
            </Campo>
            <Campo label="Botão (link)" dica="Ex.: /produtos ou https://…">
              <input className={field} value={b.botao_link} onChange={(e) => set({ ...b, botao_link: e.target.value })} />
            </Campo>
          </div>
        </div>
      );

    case "texto":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Alinhamento">
              <select
                className={field}
                value={b.alinhamento}
                onChange={(e) => set({ ...b, alinhamento: e.target.value as "esquerda" | "centro" })}
              >
                <option value="esquerda">Esquerda</option>
                <option value="centro">Centralizado</option>
              </select>
            </Campo>
            {fundo}
          </div>
          <Campo label="Título">
            <input className={field} value={b.titulo} onChange={(e) => set({ ...b, titulo: e.target.value })} />
          </Campo>
          <Campo label="Texto" dica="Linha em branco separa parágrafos.">
            <textarea rows={6} className={field} value={b.texto} onChange={(e) => set({ ...b, texto: e.target.value })} />
          </Campo>
        </div>
      );

    case "manifesto":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Título">
              <input className={field} value={b.titulo} onChange={(e) => set({ ...b, titulo: e.target.value })} />
            </Campo>
            {fundo}
          </div>
          <Campo
            label="Frases"
            dica="Uma frase por linha. Linha em branco separa blocos. O 1º bloco vira o destaque e o último fecha o manifesto."
          >
            <textarea rows={14} className={field} value={b.texto} onChange={(e) => set({ ...b, texto: e.target.value })} />
          </Campo>
        </div>
      );

    case "pilares":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Texto pequeno acima do título">
              <input className={field} value={b.etiqueta} onChange={(e) => set({ ...b, etiqueta: e.target.value })} />
            </Campo>
            {fundo}
          </div>
          <Campo label="Título (opcional)">
            <input className={field} value={b.titulo} onChange={(e) => set({ ...b, titulo: e.target.value })} />
          </Campo>
          <Campo label="Introdução (opcional)">
            <input className={field} value={b.texto} onChange={(e) => set({ ...b, texto: e.target.value })} />
          </Campo>
          {b.itens.map((it, i) => {
            const setItem = (patch: Partial<typeof it>) =>
              set({ ...b, itens: b.itens.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={i} className="grid gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-[8rem_1fr_auto]">
                <select
                  className={field}
                  value={it.icone}
                  onChange={(e) => setItem({ icone: e.target.value as SobreIcone })}
                >
                  {SOBRE_ICONES.map((ic) => (
                    <option key={ic.value} value={ic.value}>
                      {ic.label}
                    </option>
                  ))}
                </select>
                <div className="space-y-2">
                  <input
                    className={field}
                    placeholder="Título"
                    value={it.titulo}
                    onChange={(e) => setItem({ titulo: e.target.value })}
                  />
                  <input
                    className={field}
                    placeholder="Frase curta"
                    value={it.texto}
                    onChange={(e) => setItem({ texto: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  className={`${btnGhost} self-start`}
                  onClick={() => set({ ...b, itens: b.itens.filter((_, j) => j !== i) })}
                >
                  Remover
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className={btnGhost}
            onClick={() => set({ ...b, itens: [...b.itens, { icone: "estrela", titulo: "", texto: "" }] })}
          >
            + Adicionar destaque
          </button>
        </div>
      );

    case "galeria":
      return (
        <div className="space-y-3">
          <Campo label="Texto pequeno acima do título">
            <input className={field} value={b.etiqueta} onChange={(e) => set({ ...b, etiqueta: e.target.value })} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Título (opcional)">
              <input className={field} value={b.titulo} onChange={(e) => set({ ...b, titulo: e.target.value })} />
            </Campo>
            {fundo}
          </div>
          {b.imagens.map((img, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <ImagemUpload
                url={img.url}
                onChange={(url) =>
                  set({ ...b, imagens: b.imagens.map((x, j) => (j === i ? { ...x, url } : x)) })
                }
              />
              <input
                className={`${field} min-w-[12rem] flex-1`}
                placeholder="Legenda (opcional)"
                value={img.legenda}
                onChange={(e) =>
                  set({ ...b, imagens: b.imagens.map((x, j) => (j === i ? { ...x, legenda: e.target.value } : x)) })
                }
              />
              <button
                type="button"
                className={btnGhost}
                onClick={() => set({ ...b, imagens: b.imagens.filter((_, j) => j !== i) })}
              >
                Tirar da galeria
              </button>
            </div>
          ))}
          <button
            type="button"
            className={btnGhost}
            onClick={() => set({ ...b, imagens: [...b.imagens, { url: "", legenda: "" }] })}
          >
            + Adicionar foto
          </button>
          <p className="text-[11px] text-gray-500">Fotos sem imagem enviada não aparecem no site.</p>
        </div>
      );
  }
}

function resumo(b: SobreBloco): string {
  if ("titulo" in b && b.titulo) return b.titulo;
  if (b.tipo === "manifesto" || b.tipo === "texto") return b.texto.split("\n")[0] ?? "";
  return "";
}

export function SobreBlocosEditor({
  initial,
  personalizado,
  manifestoPadrao,
}: {
  initial: SobreBloco[];
  personalizado: boolean;
  manifestoPadrao: string;
}) {
  const [blocos, setBlocos] = useState(initial);
  const [aberto, setAberto] = useState<string | null>(null);
  const [novoTipo, setNovoTipo] = useState<SobreBlocoTipo>("texto");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [alterado, setAlterado] = useState(false);
  const [pending, startTransition] = useTransition();

  const update = (next: SobreBloco[]) => {
    setBlocos(next);
    setAlterado(true);
    setMsg(null);
  };
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= blocos.length) return;
    const next = [...blocos];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  const publicar = () =>
    startTransition(async () => {
      const r = await saveSobreBlocos(JSON.stringify(blocos));
      setMsg(r);
      if (r.ok) setAlterado(false);
    });

  const restaurar = () => {
    if (!confirm("Voltar a página Sobre para o layout original? As mudanças feitas aqui serão perdidas.")) return;
    startTransition(async () => {
      const r = await saveSobreBlocos(null);
      setMsg(r);
      if (r.ok) {
        setBlocos(defaultSobreBlocos(manifestoPadrao));
        setAlterado(false);
      }
    });
  };

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            Edite os blocos, mude a ordem com as setas e clique em <strong>Publicar</strong>. A prévia mostra como vai
            ficar.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={publicar}
              disabled={pending || !alterado}
              className="rounded-lg bg-admin-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1857d1] disabled:opacity-50"
            >
              {pending ? "Salvando…" : alterado ? "Publicar" : "Publicado"}
            </button>
            <a href="/sobre" target="_blank" rel="noreferrer" className={btnGhost}>
              Abrir página no site ↗
            </a>
            {personalizado || alterado ? (
              <button type="button" onClick={restaurar} disabled={pending} className={`${btnGhost} ml-auto`}>
                Restaurar original
              </button>
            ) : null}
          </div>
          {msg ? (
            <p
              className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"
              }`}
              role={msg.ok ? "status" : "alert"}
            >
              {msg.message}
            </p>
          ) : null}
        </div>

        <ol className="space-y-2">
          {blocos.map((b, i) => {
            const tipo = SOBRE_TIPOS.find((t) => t.value === b.tipo)?.label ?? b.tipo;
            const isOpen = aberto === b.id;
            return (
              <li key={b.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setAberto(isOpen ? null : b.id)}
                    aria-expanded={isOpen}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-admin-accent">{tipo}</span>
                    <span className={`block truncate text-sm ${b.visivel ? "text-gray-900" : "text-gray-400 line-through"}`}>
                      {resumo(b) || "(sem título)"}
                    </span>
                  </button>
                  <button type="button" className={btnGhost} onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">
                    ↑
                  </button>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => mover(i, 1)}
                    disabled={i === blocos.length - 1}
                    aria-label="Descer"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => update(blocos.map((x) => (x.id === b.id ? { ...x, visivel: !x.visivel } : x)))}
                  >
                    {b.visivel ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                {isOpen ? (
                  <div className="space-y-4 border-t border-gray-100 p-3">
                    <EditorBloco b={b} set={(nb) => update(blocos.map((x) => (x.id === b.id ? nb : x)))} />
                    <div className="flex gap-2 border-t border-gray-100 pt-3">
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => {
                          const copia = { ...structuredClone(b), id: novoId() };
                          const next = [...blocos];
                          next.splice(i + 1, 0, copia);
                          update(next);
                        }}
                      >
                        Duplicar
                      </button>
                      <button
                        type="button"
                        className={`${btnGhost} text-red-700`}
                        onClick={() => {
                          if (confirm("Excluir este bloco?")) update(blocos.filter((x) => x.id !== b.id));
                        }}
                      >
                        Excluir bloco
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-gray-300 bg-white p-3">
          <Campo label="Adicionar bloco">
            <select className={field} value={novoTipo} onChange={(e) => setNovoTipo(e.target.value as SobreBlocoTipo)}>
              {SOBRE_TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}: {t.descricao}
                </option>
              ))}
            </select>
          </Campo>
          <button
            type="button"
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => {
              const nb = novoBloco(novoTipo);
              update([...blocos, nb]);
              setAberto(nb.id);
            }}
          >
            Adicionar
          </button>
        </div>
      </div>

      <div className="min-w-0">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Prévia</p>
        <div className="sticky top-4 max-h-[85vh] overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="pointer-events-none">
            <SobreBlocosView blocos={blocos} />
          </div>
        </div>
      </div>
    </div>
  );
}
