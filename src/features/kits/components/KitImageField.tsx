"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/services/supabase/client";
import { parseProductImageStoragePath } from "@/services/storage/productImagePath";
import { generateKitCollage } from "@/features/kits/services/kitCollage";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const fieldClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

function bucket() {
  return process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET ?? "product-images";
}

function publicUrl(ref: string): string {
  const t = ref.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return createClient().storage.from(bucket()).getPublicUrl(t.replace(/^\/+/, "")).data.publicUrl;
}

export function KitImageField({
  initialImagem = "",
  productIds = [],
}: {
  initialImagem?: string;
  productIds?: string[];
}) {
  const [imagem, setImagem] = useState(initialImagem);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const replaceImagem = useCallback(async (url: string) => {
    const prev = imagem;
    setImagem(url);
    if (prev) {
      const oldPath = parseProductImageStoragePath(prev, bucket());
      if (oldPath?.startsWith("kits/")) await createClient().storage.from(bucket()).remove([oldPath]);
    }
  }, [imagem]);

  const onGenerate = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await generateKitCollage(productIds);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await replaceImagem(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar a montagem.");
    } finally {
      setBusy(false);
    }
  }, [productIds, replaceImagem]);

  const onFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setError(null);
    if (!ALLOWED_MIME.has(file.type)) {
      setError("Use JPEG, PNG, WEBP ou GIF.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Imagem muito grande (máx. 5 MB).");
      return;
    }
    setBusy(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg";
      const path = `kits/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage.from(bucket()).upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      await replaceImagem(supabase.storage.from(bucket()).getPublicUrl(path).data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }, [replaceImagem]);

  return (
    <div className="space-y-2">
      <input type="hidden" name="imagem" value={imagem} />
      <label className="text-sm font-medium text-gray-700">Imagem do kit</label>
      {imagem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={publicUrl(imagem)} alt="" className="h-40 w-40 rounded-lg border border-gray-100 object-cover" />
      ) : (
        <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500">
          Sem imagem
        </div>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={busy}
        className={fieldClass}
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        disabled={busy || productIds.length === 0}
        onClick={() => void onGenerate()}
        className="w-fit rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
      >
        Gerar montagem com as fotos dos produtos
      </button>
      {busy && <p className="text-xs text-gray-500">Enviando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {imagem && (
        <button
          type="button"
          className="text-sm font-semibold text-red-600 hover:underline"
          onClick={() => setImagem("")}
        >
          Remover imagem
        </button>
      )}
    </div>
  );
}
