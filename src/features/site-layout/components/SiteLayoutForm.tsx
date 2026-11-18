"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";

import { saveSiteLayout, type SaveSiteLayoutState } from "@/features/site-layout/services/saveSiteLayout";
import {
  SITE_HOME_BANNER_COUNT,
  SITE_HOME_BANNER_FIELDS,
  siteLayoutBannerUrlsFromRow,
} from "@/features/site-layout/utils/homeBannerUrls";
import { uploadSiteBannerFile } from "@/services/storage/uploadSiteBanner";
import type { SiteLayoutRow } from "@/types/siteLayout";

type SiteLayoutFormProps = {
  initial: SiteLayoutRow;
};

export function SiteLayoutForm({ initial }: SiteLayoutFormProps) {
  const [banners, setBanners] = useState(() => siteLayoutBannerUrlsFromRow(initial, { keepEmpty: true }));
  const [busy, setBusy] = useState(() => Array.from({ length: SITE_HOME_BANNER_COUNT }, () => false));
  const [errs, setErrs] = useState<(string | null)[]>(() =>
    Array.from({ length: SITE_HOME_BANNER_COUNT }, () => null)
  );
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [state, formAction, pending] = useActionState(saveSiteLayout, null as SaveSiteLayoutState | null);

  const anyBusy = busy.some(Boolean);

  const onPick = async (index: number, file: File | null) => {
    if (!file) return;
    const prev = banners[index] ?? "";
    setErrs((e) => e.map((v, i) => (i === index ? null : v)));
    setBusy((b) => b.map((v, i) => (i === index ? true : v)));
    try {
      const url = await uploadSiteBannerFile(file, { replaceRef: prev || null });
      setBanners((current) => current.map((u, i) => (i === index ? url : u)));
    } catch (e) {
      setErrs((errs) => errs.map((v, i) => (i === index ? (e instanceof Error ? e.message : "Falha no envio.") : v)));
    } finally {
      setBusy((b) => b.map((v, i) => (i === index ? false : v)));
    }
  };

  const clearBanner = (index: number) => {
    setBanners((current) => current.map((u, i) => (i === index ? "" : u)));
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Seções de layout">
          <span className="border-b-2 border-admin-accent px-1 pb-3 text-sm font-semibold text-gray-900">
            Site
          </span>
        </nav>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">Banners da página inicial</h2>
        <p className="mt-1 text-sm text-gray-600">
          Até {SITE_HOME_BANNER_COUNT} imagens, 1920×550 px. Slots vazios são ignorados.
        </p>

        {state?.ok === true && (
          <p
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            role="status"
          >
            {state.message}
          </p>
        )}
        {state?.ok === false && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
            {state.message}
          </p>
        )}

        <form action={formAction} className="mt-6 space-y-8">
          {SITE_HOME_BANNER_FIELDS.map((field, index) => (
            <input key={field} type="hidden" name={field} value={banners[index] ?? ""} />
          ))}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: SITE_HOME_BANNER_COUNT }, (_, index) => {
              const url = banners[index] ?? "";
              const slotBusy = busy[index];
              const err = errs[index];
              const isFirst = index === 0;
              return (
                <div key={index}>
                  <p className="text-sm font-medium text-gray-800">
                    Banner {index + 1}
                    {!isFirst ? <span className="font-normal text-gray-500"> (opcional)</span> : null}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
                      disabled={slotBusy || pending}
                      onClick={() => fileRefs.current[index]?.click()}
                    >
                      {slotBusy ? "Enviando…" : "Escolher imagem"}
                    </button>
                    <input
                      ref={(el) => {
                        fileRefs.current[index] = el;
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(e) => void onPick(index, e.target.files?.[0] ?? null)}
                    />
                  </div>
                  {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}
                  {url ? (
                    <div className="mt-3 space-y-2">
                      <div className="relative aspect-[1920/550] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                        <Image src={url} alt="" fill className="object-contain" unoptimized />
                      </div>
                      <button
                        type="button"
                        className="text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
                        onClick={() => clearBanner(index)}
                      >
                        Remover imagem
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">
                      {isFirst
                        ? "Nenhuma imagem (usa o banner padrão da loja se todos estiverem vazios)."
                        : "Vazio — não entra na rotação."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
            <button
              type="submit"
              className="rounded-lg bg-admin-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1857d1] disabled:opacity-60"
              disabled={pending || anyBusy}
            >
              {pending ? "Salvando…" : "Salvar layout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}