"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProductStatusBadge } from "@/features/produtos/components/ProductStatusBadge";
import { publishKit } from "@/features/kits/services/publishKit";
import { unpublishKit } from "@/features/kits/services/unpublishKit";
import type { KitStatus } from "@/features/kits/utils/kitStatus";

export function KitPublishActions({ kitId, status }: { kitId: string; status: KitStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [unpublishOpen, setUnpublishOpen] = useState(false);

  function runPublish() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await publishKit(kitId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess(result.message);
      router.refresh();
    });
  }

  function runUnpublish() {
    setUnpublishOpen(false);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await unpublishKit(kitId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess(result.message);
      router.refresh();
    });
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <ProductStatusBadge status={status} />
        {status === "draft" ? (
          <button
            type="button"
            disabled={pending}
            onClick={runPublish}
            className="inline-flex items-center justify-center rounded-lg bg-admin-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1857d1] disabled:opacity-60"
          >
            {pending ? "Publicando…" : "Publicar Kit"}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setUnpublishOpen(true)}
            className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 disabled:opacity-60"
          >
            {pending ? "Despublicando…" : "Despublicar"}
          </button>
        )}
        <a
          href={`/kit/preview/${kitId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-admin-accent hover:underline"
        >
          Ver prévia
        </a>
      </div>
      {status === "draft" && (
        <p className="text-xs text-gray-500">
          Salve as alterações do formulário antes de publicar. A validação usa os dados já gravados.
        </p>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          {success}
        </div>
      )}
      <ConfirmDialog
        open={unpublishOpen}
        onOpenChange={setUnpublishOpen}
        title="Despublicar kit?"
        description={
          <span className="font-medium text-gray-800">
            O kit deixará de aparecer no site imediatamente. Você poderá publicar de novo depois.
          </span>
        }
        confirmLabel="Sim, despublicar"
        onConfirm={runUnpublish}
      />
    </div>
  );
}
