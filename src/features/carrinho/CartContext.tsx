"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { clampPercent } from "@/features/produtos/utils/paymentDiscount";
import type { ProductSummary } from "@/types/product";

const STORAGE_KEY = "accorsi-store-cart-v1";

const CART_TOAST_DURATION_MS = 3000;

export type CartLine = ProductSummary & { quantity: number };

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  isReady: boolean;
  addProduct: (product: ProductSummary) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  removeProduct: (productId: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function parseStoredLine(o: unknown): CartLine | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.titulo !== "string" || typeof r.cod_produto !== "string") {
    return null;
  }
  const valor = Number(r.valor);
  if (!Number.isFinite(valor)) return null;
  if (!(r.imageUrl === null || typeof r.imageUrl === "string")) return null;
  const qtyRaw = r.quantity;
  if (typeof qtyRaw !== "number" || !Number.isInteger(qtyRaw) || qtyRaw < 1) return null;

  const declared = r.quantidade_estoque;
  const hasDeclared =
    typeof declared === "number" && Number.isFinite(declared) && declared >= 0;
  const stock = hasDeclared ? Math.floor(declared) : Math.max(qtyRaw, 1);
  if (stock <= 0) return null;

  const quantity = Math.min(qtyRaw, stock);
  if (quantity < 1) return null;

  const desconto_pix_percent = clampPercent(r.desconto_pix_percent ?? 0);
  const desconto_cartao_percent = clampPercent(r.desconto_cartao_percent ?? 0);
  const somente_retirada_loja = r.somente_retirada_loja === true;

  return {
    id: r.id,
    titulo: r.titulo,
    cod_produto: r.cod_produto,
    valor,
    imageUrl: r.imageUrl as string | null,
    quantidade_estoque: stock,
    desconto_pix_percent,
    desconto_cartao_percent,
    somente_retirada_loja,
    quantity,
  };
}

function loadLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseStoredLine).filter((l): l is CartLine => l != null);
  } catch {
    return [];
  }
}

function persistLines(lines: CartLine[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    return true;
  } catch {
    return false;
  }
}

type CartToast = { tone: "success" | "error" | "warning"; text: string };
type CartToastState = CartToast & { animKey: number };

function CartToastPanel({ toast }: { toast: CartToastState }) {
  const [slideIn, setSlideIn] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const openFrame = requestAnimationFrame(() => {
      setSlideIn(true);
      if (!bar) return;
      bar.style.transition = "none";
      bar.style.transform = "scaleX(1)";
      void bar.offsetWidth;
      bar.style.transition = `transform ${CART_TOAST_DURATION_MS}ms linear`;
      bar.style.transform = "scaleX(0)";
    });
    return () => cancelAnimationFrame(openFrame);
  }, []);

  return (
    <div
      className={[
        "pointer-events-auto w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-sm border shadow-xl transition-[transform,opacity] duration-300 ease-out",
        slideIn ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        toast.tone === "success"
          ? "border-emerald-700/25 bg-emerald-50/95 text-emerald-950"
          : toast.tone === "warning"
            ? "border-amber-500/35 bg-amber-50/95 text-amber-950"
            : "border-red-500/30 bg-red-50/95 text-red-950",
      ].join(" ")}
    >
      <p className="px-4 py-3 text-sm font-semibold leading-snug">{toast.text}</p>
      <div className="h-1 w-full bg-black/[0.08]" aria-hidden>
        <div
          ref={barRef}
          className="h-full w-full origin-left bg-store-accent will-change-transform"
        />
      </div>
    </div>
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<CartToastState | null>(null);
  const toastHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAnimKeyRef = useRef(0);
  /** Após alterar o carrinho, aguarda persistência bem-sucedida para mostrar toast (sucesso, aviso de última unidade, etc.). */
  const pendingCartToast = useRef<CartToast | null>(null);

  const showToast = useCallback((next: CartToast) => {
    if (toastHideRef.current) clearTimeout(toastHideRef.current);
    toastAnimKeyRef.current += 1;
    setToast({ ...next, animKey: toastAnimKeyRef.current });
    toastHideRef.current = setTimeout(() => {
      setToast(null);
      toastHideRef.current = null;
    }, CART_TOAST_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (toastHideRef.current) clearTimeout(toastHideRef.current);
    };
  }, []);

  useEffect(() => {
    // Lê o carrinho salvo só no cliente após a hidratação (no SSR `localStorage` não existe).
    queueMicrotask(() => {
      setLines(loadLines());
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!persistLines(lines)) {
      const wasPending = pendingCartToast.current != null;
      pendingCartToast.current = null;
      queueMicrotask(() => {
        showToast({
          tone: "error",
          text: wasPending
            ? "Falha ao adicionar o produto ao carrinho. Tente novamente."
            : "Não foi possível salvar o carrinho. Tente novamente.",
        });
      });
      queueMicrotask(() => setLines(loadLines()));
      return;
    }
    if (pendingCartToast.current) {
      const msg = pendingCartToast.current;
      pendingCartToast.current = null;
      queueMicrotask(() => showToast(msg));
    }
  }, [lines, ready, showToast]);

  const addProduct = useCallback(
    (product: ProductSummary) => {
      const stock = Math.max(0, Math.floor(Number(product.quantidade_estoque)));
      if (stock <= 0) {
        showToast({ tone: "error", text: "Este produto não está disponível no momento." });
        return;
      }

      setLines((prev) => {
        const i = prev.findIndex((l) => l.id === product.id);
        if (i >= 0) {
          const line = prev[i];
          if (line.quantity >= stock) {
            queueMicrotask(() =>
              showToast({
                tone: "error",
                text: "Não é possível adicionar mais deste produto.",
              }),
            );
            return prev;
          }
          pendingCartToast.current =
            stock === 1
              ? {
                  tone: "warning",
                  text: "Produto adicionado. Esta é a última peça disponível.",
                }
              : { tone: "success", text: "Sucesso ao adicionar o produto ao carrinho." };
          return prev.map((l, idx) =>
            idx === i
              ? {
                  ...l,
                  ...product,
                  desconto_pix_percent: clampPercent(product.desconto_pix_percent),
                  desconto_cartao_percent: clampPercent(product.desconto_cartao_percent),
                  quantity: line.quantity + 1,
                  quantidade_estoque: stock,
                }
              : l,
          );
        }
        pendingCartToast.current =
          stock === 1
            ? {
                tone: "warning",
                text: "Produto adicionado. Esta é a última peça disponível.",
              }
            : { tone: "success", text: "Sucesso ao adicionar o produto ao carrinho." };
        return [
          ...prev,
          {
            ...product,
            desconto_pix_percent: clampPercent(product.desconto_pix_percent),
            desconto_cartao_percent: clampPercent(product.desconto_cartao_percent),
            quantity: 1,
            quantidade_estoque: stock,
          },
        ];
      });
    },
    [showToast],
  );

  const increment = useCallback(
    (productId: string) => {
      setLines((prev) => {
        const line = prev.find((l) => l.id === productId);
        if (!line) return prev;
        const stock = Math.max(0, Math.floor(Number(line.quantidade_estoque)));
        if (line.quantity >= stock) {
          queueMicrotask(() =>
            showToast({
              tone: "error",
              text: "Você já adicionou a quantidade máxima permitida deste produto.",
            }),
          );
          return prev;
        }
        const nextQty = line.quantity + 1;
        return prev.map((l) => (l.id === productId ? { ...l, quantity: nextQty } : l));
      });
    },
    [showToast],
  );

  const decrement = useCallback((productId: string) => {
    setLines((prev) =>
      prev
        .map((l) => (l.id === productId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== productId));
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.valor * l.quantity, 0);
    return {
      lines,
      itemCount,
      subtotal,
      isReady: ready,
      addProduct,
      increment,
      decrement,
      removeProduct,
    };
  }, [lines, ready, addProduct, increment, decrement, removeProduct]);

  return (
    <CartContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          className="pointer-events-none fixed bottom-0 right-0 z-[200] pb-3 pr-3 sm:pb-5 sm:pr-5"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <CartToastPanel key={toast.animKey} toast={toast} />
        </div>
      ) : null}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart deve ser usado dentro de CartProvider");
  }
  return ctx;
}
