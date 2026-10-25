import { createClient } from "@/services/supabase/client";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const REQUIRED_IMAGE_WIDTH = 1200;
const REQUIRED_IMAGE_HEIGHT = 1200;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/pjpeg",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/gif",
]);
const EXT_FROM_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/x-png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function productImagesBucket() {
  return process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET ?? "product-images";
}

function isHeicLike(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t.includes("heic") || t.includes("heif")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ext === "heic" || ext === "heif";
}

/** Alguns navegadores/celulares enviam type vazio ou octet-stream; inferir pela extensão. */
export function normalizeImageFile(file: File): { file: File } | { error: string } {
  if (isHeicLike(file)) {
    return {
      error:
        "Fotos HEIC/HEIF (iPhone) não são aceitas direto no navegador. Nas configurações da câmera use «Formatos mais compatíveis», ou exporte a foto como JPEG antes de enviar.",
    };
  }
  if (ALLOWED_MIME.has(file.type)) {
    return { file };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const inferred = EXT_TO_MIME[ext];
  if (inferred && ALLOWED_MIME.has(inferred)) {
    return {
      file: new File([file], file.name, { type: inferred, lastModified: file.lastModified }),
    };
  }
  if (!file.type) {
    return {
      error:
        "Não foi possível identificar o tipo da imagem. Renomeie com .jpg / .png / .webp ou tire a foto de novo em JPEG.",
    };
  }
  return { error: "Use JPEG, PNG, WEBP ou GIF." };
}

/** Extensões aceitas pelo upload (para filtrar arquivos de uma pasta). */
export function isSupportedImageName(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ext in EXT_TO_MIME;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(previewUrl);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error("Não foi possível ler as dimensões da imagem."));
    };

    img.src = previewUrl;
  });
}

function resizeImageToSquare(
  file: File,
  targetWidth: number,
  targetHeight: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(previewUrl);
          reject(new Error("Não foi possível preparar a conversão da imagem."));
          return;
        }

        if (img.naturalWidth < 1 || img.naturalHeight < 1) {
          URL.revokeObjectURL(previewUrl);
          reject(new Error("Imagem sem dimensão válida."));
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const scale = Math.min(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight);
        const drawWidth = img.naturalWidth * scale;
        const drawHeight = img.naturalHeight * scale;
        const offsetX = (targetWidth - drawWidth) / 2;
        const offsetY = (targetHeight - drawHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(previewUrl);
            if (!blob) {
              reject(new Error("Não foi possível converter a imagem para 1200x1200."));
              return;
            }

            const baseName = file.name.replace(/\.[^.]+$/, "") || "produto";
            const normalized = new File([blob], `${baseName}-1200x1200.webp`, {
              type: "image/webp",
              lastModified: Date.now(),
            });
            resolve(normalized);
          },
          "image/webp",
          0.92
        );
      } catch {
        URL.revokeObjectURL(previewUrl);
        reject(new Error("Falha ao redimensionar a imagem."));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error("Não foi possível carregar a imagem para conversão."));
    };

    img.src = previewUrl;
  });
}

/**
 * Valida, ajusta para 1200x1200 (webp) quando necessário e envia ao bucket de produtos.
 * Retorna a URL pública ou a mensagem de erro.
 */
export async function uploadProductImage(file: File): Promise<{ url: string } | { error: string }> {
  const normalized = normalizeImageFile(file);
  if ("error" in normalized) return normalized;
  file = normalized.file;
  if (file.size > MAX_FILE_BYTES) {
    return { error: "Arquivo muito grande (máximo 5 MB)." };
  }

  let width = 0;
  let height = 0;
  try {
    const dims = await readImageDimensions(file);
    width = dims.width;
    height = dims.height;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível validar a imagem." };
  }

  let fileToUpload = file;
  if (width !== REQUIRED_IMAGE_WIDTH || height !== REQUIRED_IMAGE_HEIGHT) {
    try {
      fileToUpload = await resizeImageToSquare(file, REQUIRED_IMAGE_WIDTH, REQUIRED_IMAGE_HEIGHT);
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Não foi possível ajustar a imagem para 1200x1200.",
      };
    }
  }

  if (fileToUpload.size > MAX_FILE_BYTES) {
    return { error: "Imagem ajustada ficou maior que 5 MB. Tente uma imagem menor." };
  }

  try {
    const supabase = createClient();
    const bucket = productImagesBucket();
    const ext = EXT_FROM_MIME[fileToUpload.type] ?? "jpg";
    const path = `produtos/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, fileToUpload, {
      contentType: fileToUpload.type,
      upsert: false,
    });

    if (upErr) {
      const msg =
        upErr.message.includes("JWT") ||
        upErr.message.includes("policy") ||
        upErr.message.includes("row-level security") ||
        upErr.message.includes("RLS")
          ? "Sem permissão no Storage: o bucket só permitia upload logado (authenticated). Sem Auth no admin, inclua uma política de INSERT para o role anon neste bucket (migração 20260410200000 no projeto) ou implemente login Supabase."
          : upErr.message;
      return { error: msg };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha no envio da imagem." };
  }
}
