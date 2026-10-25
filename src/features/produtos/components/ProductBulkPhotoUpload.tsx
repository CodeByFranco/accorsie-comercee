"use client";

import { useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { LoadingDots } from "@/features/produtos/components/LoadingDots";
import {
  attachBulkPhotos,
  listProductsForBulkPhotos,
  type BulkPhotoProduct,
} from "@/features/produtos/services/bulkProductPhotos";
import { matchBulkPhotos, type BulkPhotoGroup } from "@/features/produtos/utils/bulkPhotoMatching";
import { isSupportedImageName, uploadProductImage } from "@/features/produtos/utils/productImageUpload";

type Group = BulkPhotoGroup<BulkPhotoProduct>;

type RowResult = { state: "enviando" } | { state: "ok"; published: boolean; message: string } | { state: "erro"; message: string };

const CONCORRENCIA = 3;

function groupKey(g: Group): string {
  return g.product ? g.product.id : `sem:${g.chave}`;
}

export function ProductBulkPhotoUpload() {
  const router = useRouter();
  const titleId = useId();
  const folderRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [publicar, setPublicar] = useState(true);
  const [incluirComFotos, setIncluirComFotos] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Record<string, RowResult>>({});

  const reset = () => {
    setGroups(null);
    setResults({});
    setError(null);
    if (folderRef.current) folderRef.current.value = "";
    if (filesRef.current) filesRef.current.value = "";
  };

  const close = () => {
    if (sending) return;
    const enviou = Object.keys(results).length > 0;
    setOpen(false);
    reset();
    if (enviou) router.refresh();
  };

  const handleFiles = async (list: FileList | null) => {
    const files = [...(list ?? [])].filter((f) => isSupportedImageName(f.name));
    if (files.length === 0) {
      setError("Nenhuma imagem (.jpg, .png, .webp, .gif) encontrada na seleção.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await listProductsForBulkPhotos();
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setResults({});
      setGroups(matchBulkPhotos(files, res.products));
    } finally {
      setLoading(false);
    }
  };

  const enviaveis = useMemo(
    () => (groups ?? []).filter((g) => g.product && (incluirComFotos || g.product.fotos === 0)),
    [groups, incluirComFotos]
  );
  const semProduto = (groups ?? []).filter((g) => !g.product);
  const jaTemFotos = (groups ?? []).filter((g) => g.product && g.product.fotos > 0);

  const enviar = async () => {
    if (enviaveis.length === 0) return;
    setSending(true);
    const fila = [...enviaveis];

    const processar = async (g: Group) => {
      const key = groupKey(g);
      setResults((r) => ({ ...r, [key]: { state: "enviando" } }));
      const urls: string[] = [];
      const falhas: string[] = [];
      for (const file of g.files) {
        const up = await uploadProductImage(file);
        if ("url" in up) urls.push(up.url);
        else falhas.push(`${file.name}: ${up.error}`);
      }
      if (urls.length === 0) {
        setResults((r) => ({ ...r, [key]: { state: "erro", message: falhas.join(" · ") || "Falha no envio." } }));
        return;
      }
      try {
        const res = await attachBulkPhotos(g.product!.id, urls, publicar);
        const extra = falhas.length ? ` (${falhas.length} imagem(ns) com erro: ${falhas.join(" · ")})` : "";
        setResults((r) => ({
          ...r,
          [key]: res.ok
            ? { state: "ok", published: res.published, message: res.message + extra }
            : { state: "erro", message: res.message },
        }));
      } catch (e) {
        setResults((r) => ({
          ...r,
          [key]: { state: "erro", message: e instanceof Error ? e.message : "Falha ao salvar as fotos." },
        }));
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(CONCORRENCIA, fila.length) }, async () => {
          for (let g = fila.shift(); g; g = fila.shift()) await processar(g);
        })
      );
    } finally {
      setSending(false);
    }
  };

  const resultados = Object.values(results);
  const concluido = !sending && resultados.length > 0;
  const publicados = resultados.filter((r) => r.state === "ok" && r.published).length;
  const comErro = resultados.filter((r) => r.state === "erro").length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
      >
        Subir fotos em lote
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
              <button
                type="button"
                aria-label="Fechar"
                className="absolute inset-0 bg-black/50"
                disabled={sending}
                onClick={close}
              />
              <div
                className="relative z-10 flex max-h-[min(92vh,46rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
              >
                <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
                  <h3 id={titleId} className="text-base font-semibold text-gray-900">
                    Subir fotos em lote
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Escolha a pasta com as fotos. Cada imagem (ou subpasta) deve ter o nome do código do produto,
                    por exemplo <span className="font-mono">AMD13025.png</span> para o produto{" "}
                    <span className="font-mono">AMD13025/24679</span>.
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                  <input
                    ref={folderRef}
                    type="file"
                    multiple
                    className="hidden"
                    // @ts-expect-error atributo não padronizado, suportado pelos navegadores
                    webkitdirectory=""
                    onChange={(e) => void handleFiles(e.target.files)}
                  />
                  <input
                    ref={filesRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                    className="hidden"
                    onChange={(e) => void handleFiles(e.target.files)}
                  />

                  {!groups ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-4 py-10 text-center">
                      {loading ? (
                        <LoadingDots label="Lendo arquivos" />
                      ) : (
                        <>
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => folderRef.current?.click()}
                              className="rounded-lg bg-admin-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1857d1]"
                            >
                              Escolher pasta
                            </button>
                            <button
                              type="button"
                              onClick={() => filesRef.current?.click()}
                              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                            >
                              Escolher arquivos
                            </button>
                          </div>
                          <p className="text-xs text-gray-500">
                            As imagens são ajustadas para 1200x1200 automaticamente.
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                          {enviaveis.length} produto(s) para enviar
                        </span>
                        {jaTemFotos.length > 0 ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                            {jaTemFotos.length} já tem fotos
                          </span>
                        ) : null}
                        {semProduto.length > 0 ? (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700">
                            {semProduto.length} sem produto correspondente
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2 text-sm text-gray-700">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={publicar}
                            disabled={sending || concluido}
                            onChange={(e) => setPublicar(e.target.checked)}
                          />
                          Publicar os rascunhos que ficarem completos
                        </label>
                        {jaTemFotos.length > 0 ? (
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={incluirComFotos}
                              disabled={sending || concluido}
                              onChange={(e) => setIncluirComFotos(e.target.checked)}
                            />
                            Adicionar também aos produtos que já têm fotos
                          </label>
                        ) : null}
                      </div>

                      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                        {groups.map((g) => {
                          const key = groupKey(g);
                          const r = results[key];
                          const pulado = g.product && g.product.fotos > 0 && !incluirComFotos;
                          return (
                            <li key={key} className="flex flex-col gap-1 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-gray-900">
                                  <span className="font-mono">{g.chave}</span>
                                  <span className="ml-2 text-xs font-normal text-gray-500">{g.files.length} imagem(ns)</span>
                                </p>
                                <p className="truncate text-xs text-gray-500">
                                  {g.product
                                    ? `${g.product.titulo ?? "(sem título)"} · ${g.product.status === "draft" ? "rascunho" : "publicado"}`
                                    : g.ambiguos.length > 1
                                      ? `Código em ${g.ambiguos.length} produtos: ${g.ambiguos.map((p) => p.cod_produto).join(", ")}`
                                      : "Nenhum produto com este código"}
                                </p>
                              </div>
                              <div className="shrink-0 text-xs sm:max-w-[45%] sm:text-right">
                                {r?.state === "enviando" ? (
                                  <LoadingDots label="Enviando" size="sm" />
                                ) : r?.state === "ok" ? (
                                  <span className={r.published ? "text-emerald-700" : "text-amber-700"}>{r.message}</span>
                                ) : r?.state === "erro" ? (
                                  <span className="text-red-700">{r.message}</span>
                                ) : !g.product ? (
                                  <span className="text-red-700">Não será enviado</span>
                                ) : pulado ? (
                                  <span className="text-amber-700">Já tem {g.product.fotos} foto(s)</span>
                                ) : (
                                  <span className="text-gray-500">Pronto</span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-xs text-gray-500">
                    {concluido
                      ? `Concluído: ${resultados.length - comErro} com fotos, ${publicados} publicado(s), ${comErro} com erro.`
                      : null}
                  </p>
                  <div className="flex gap-2">
                    {groups && !sending ? (
                      <button
                        type="button"
                        onClick={reset}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Escolher outra pasta
                      </button>
                    ) : null}
                    {groups && !concluido ? (
                      <button
                        type="button"
                        disabled={sending || enviaveis.length === 0}
                        onClick={() => void enviar()}
                        className="inline-flex min-w-[9rem] items-center justify-center rounded-lg bg-admin-accent px-4 py-2 text-sm font-semibold text-white hover:bg-[#1857d1] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending ? (
                          <LoadingDots label="Enviando" size="sm" dotClassName="bg-white" className="text-white" />
                        ) : (
                          `Enviar ${enviaveis.length} produto(s)`
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={sending}
                        onClick={close}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                      >
                        Fechar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
