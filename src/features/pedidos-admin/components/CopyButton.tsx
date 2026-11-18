"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "Copiar",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard indisponível */
        }
      }}
      className={
        className ??
        "shrink-0 rounded-md px-2 py-1 text-xs font-medium text-admin-accent transition hover:bg-admin-accent/10"
      }
    >
      {copied ? "Copiado ✓" : label}
    </button>
  );
}
