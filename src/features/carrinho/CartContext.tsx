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
import type { KitChoiceSelection } from "@/types/kit";

const STORAGE_KEY = "accorsi-store-cart-v2";

const CART_TOAST_DURATION_MS = 3000;

export type CartLine = ProductSummary & { quantity: number };

export type CartKitClaim = {
  kitId: string;
  nome: string;
  /** product_id -> qty required by the kit */
  items: Record<string, number>;
  /** Catalog economia at add time (preview; checkout recalculates). */
  economia: number;
  /** Escolhas do cliente (ex.: óleo e litros); validadas na RPC. */
  escolhas?: KitChoiceSelection[];
};

type CartContextValue = {
  lines: CartLine[];
  kitClaims: CartKitClaim[];
  itemCount: number;
  /** Soma dos preços de catálogo das linhas. */
  subtotal: number;
  /** Economia dos claims ainda válidos. */
  kitDesconto: number;
  /** subtotal - kitDesconto */
  subtotalComKits: number;
  isReady: boolean;
  addProduct: (product: ProductSummary) => void;
  addProducts: (items: Array<ProductSummary & { quantity: number }>) => void;
  addKit: (claim: CartKitClaim, items: Array<ProductSummary & { quantity: number }>) => void;
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

  return {
    id: r.id,
    titulo: r.titulo,
    cod_produto: r.cod_produto,
    valor,
    imageUrl: r.imageUrl as string | null,
    quantidade_estoque: stock,
    desconto_pix_percent: clampPercent(r.desconto_pix_percent ?? 0),
    desconto_cartao_percent: clampPercent(r.desconto_cartao_percent ?? 0),
    somente_retirada_loja: r.somente_retirada_loja === true,
    quantity,
  };
}

function parseStoredClaim(o: unknown): CartKitClaim | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  if (typeof r.kitId !== "string" || typeof r.nome !== "string") return null;
  if (!r.items || typeof r.items !== "object") return null;
  const items: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.items as Record<string, unknown>)) {
    const n = Number(v);
    if (!k || !Number.isFinite(n) || n < 1) continue;
    items[k] = Math.floor(n);
  }
  if (Object.keys(items).length === 0) return null;
  const economia = Number(r.economia);
  const escolhas: KitChoiceSelection[] = [];
  if (Array.isArray(r.escolhas)) {
    for (const e of r.escolhas as unknown[]) {
      if (!e || typeof e !== "object") continue;
      const s = e as Record<string, unknown>;
      const quantidade = Number(s.quantidade);
      if (typeof s.kit_item_id !== "string" || typeof s.product_id !== "string") continue;
      if (!Number.isInteger(quantidade) || quantidade < 1) continue;
      escolhas.push({ kit_item_id: s.kit_item_id, product_id: s.product_id, quantidade });
    }
  }
  return {
    kitId: r.kitId,
    nome: r.nome,
    items,
    economia: Number.isFinite(economia) && economia > 0 ? economia : 0,
    ...(escolhas.length > 0 ? { escolhas } : {}),
  };
}

function claimStillValid(claim: CartKitClaim, lines: CartLine[]): boolean {
  const qtyById = new Map(lines.map((l) => [l.id, l.quantity]));
  for (const [pid, need] of Object.entries(claim.items)) {
    if ((qtyById.get(pid) ?? 0) < need) return false;
  }
  return true;
}

/** Drop claims that cart quantities no longer cover (allocate sequentially). */
function pruneClaims(claims: CartKitClaim[], lines: CartLine[]): CartKitClaim[] {
  const pool = new Map(lines.map((l) => [l.id, l.quantity]));
  const kept: CartKitClaim[] = [];
  for (const claim of claims) {
    let ok = true;
    for (const [pid, need] of Object.entries(claim.items)) {
      if ((pool.get(pid) ?? 0) < need) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (const [pid, need] of Object.entries(claim.items)) {
      pool.set(pid, (pool.get(pid) ?? 0) - need);
    }
    kept.push(claim);
  }
  return kept;
}

function loadState(): { lines: CartLine[]; kitClaims: CartKitClaim[] } {
  if (typeof window === "undefined") return { lines: [], kitClaims: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // migrate v1 lines if present
      const v1 = localStorage.getItem("accorsi-store-cart-v1");
      if (v1) {
        const parsed = JSON.parse(v1) as unknown;
        const lines = Array.isArray(parsed)
          ? parsed.map(parseStoredLine).filter((l): l is CartLine => l != null)
          : [];
        return { lines, kitClaims: [] };
      }
      return { lines: [], kitClaims: [] };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        lines: parsed.map(parseStoredLine).filter((l): l is CartLine => l != null),
        kitClaims: [],
      };
    }
    if (parsed && typeof parsed === "object") {
      const o = parsed as Record<string, unknown>;
      const lines = Array.isArray(o.lines)
        ? o.lines.map(parseStoredLine).filter((l): l is CartLine => l != null)
        : [];
      const kitClaims = Array.isArray(o.kitClaims)
        ? o.kitClaims.map(parseStoredClaim).filter((c): c is CartKitClaim => c != null)
        : [];
      return { lines, kitClaims: pruneClaims(kitClaims, lines) };
    }
    return { lines: [], kitClaims: [] };
  } catch {
    return { lines: [], kitClaims: [] };
  }
}

function persistState(lines: CartLine[], kitClaims: CartKitClaim[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, kitClaims }));
    return true;
  } catch {
    return false;
  }
}

function mergeProductsIntoLines(
  prev: CartLine[],
  items: Array<ProductSummary & { quantity: number }>,
): { lines: CartLine[]; ok: boolean; message?: string } {
  let next = [...prev];
  for (const item of items) {
    const stock = Math.max(0, Math.floor(Number(item.quantidade_estoque)));
    const addQty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    if (stock <= 0) {
      return { lines: prev, ok: false, message: `"${item.titulo}" não está disponível.` };
    }
    const i = next.findIndex((l) => l.id === item.id);
    if (i >= 0) {
      const line = next[i];
      const newQty = line.quantity + addQty;
      if (newQty > stock) {
        return {
          lines: prev,
          ok: false,
          message: `Estoque insuficiente para "${item.titulo}".`,
        };
      }
      next = next.map((l, idx) =>
        idx === i
          ? {
              ...l,
              ...item,
              desconto_pix_percent: clampPercent(item.desconto_pix_percent),
              desconto_cartao_percent: clampPercent(item.desconto_cartao_percent),
              quantity: newQty,
              quantidade_estoque: stock,
            }
          : l,
      );
    } else {
      if (addQty > stock) {
        return {
          lines: prev,
          ok: false,
          message: `Estoque insuficiente para "${item.titulo}".`,
        };
      }
      next = [
        ...next,
        {
          ...item,
          desconto_pix_percent: clampPercent(item.desconto_pix_percent),
          desconto_cartao_percent: clampPercent(item.desconto_cartao_percent),
          quantity: addQty,
          quantidade_estoque: stock,
        },
      ];
    }
  }
  return { lines: next, ok: true };
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
        <div ref={barRef} className="h-full w-full origin-left bg-store-accent will-change-transform" />
      </div>
    </div>
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [kitClaims, setKitClaims] = useState<CartKitClaim[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<CartToastState | null>(null);
  const toastHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAnimKeyRef = useRef(0);
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
    queueMicrotask(() => {
      const s = loadState();
      setLines(s.lines);
      setKitClaims(s.kitClaims);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!persistState(lines, kitClaims)) {
      const wasPending = pendingCartToast.current != null;
      pendingCartToast.current = null;
      queueMicrotask(() => {
        showToast({
          tone: "error",
          text: wasPending
            ? "Falha ao atualizar o carrinho. Tente novamente."
            : "Não foi possível salvar o carrinho. Tente novamente.",
        });
      });
      queueMicrotask(() => {
        const s = loadState();
        setLines(s.lines);
        setKitClaims(s.kitClaims);
      });
      return;
    }
    if (pendingCartToast.current) {
      const msg = pendingCartToast.current;
      pendingCartToast.current = null;
      queueMicrotask(() => showToast(msg));
    }
  }, [lines, kitClaims, ready, showToast]);

  const addProduct = useCallback(
    (product: ProductSummary) => {
      const stock = Math.max(0, Math.floor(Number(product.quantidade_estoque)));
      if (stock <= 0) {
        showToast({ tone: "error", text: "Este produto não está disponível no momento." });
        return;
      }
      setLines((prev) => {
        const merged = mergeProductsIntoLines(prev, [{ ...product, quantity: 1 }]);
        if (!merged.ok) {
          queueMicrotask(() => showToast({ tone: "error", text: merged.message ?? "Erro ao adicionar." }));
          return prev;
        }
        pendingCartToast.current =
          stock === 1
            ? { tone: "warning", text: "Produto adicionado. Esta é a última peça disponível." }
            : { tone: "success", text: "Sucesso ao adicionar o produto ao carrinho." };
        setKitClaims((claims) => pruneClaims(claims, merged.lines));
        return merged.lines;
      });
    },
    [showToast],
  );

  const addProducts = useCallback(
    (items: Array<ProductSummary & { quantity: number }>) => {
      setLines((prev) => {
        const merged = mergeProductsIntoLines(prev, items);
        if (!merged.ok) {
          queueMicrotask(() => showToast({ tone: "error", text: merged.message ?? "Erro ao adicionar." }));
          return prev;
        }
        pendingCartToast.current = {
          tone: "success",
          text: "Itens adicionados ao carrinho.",
        };
        setKitClaims((claims) => pruneClaims(claims, merged.lines));
        return merged.lines;
      });
    },
    [showToast],
  );

  const addKit = useCallback(
    (claim: CartKitClaim, items: Array<ProductSummary & { quantity: number }>) => {
      setLines((prev) => {
        const merged = mergeProductsIntoLines(prev, items);
        if (!merged.ok) {
          queueMicrotask(() => showToast({ tone: "error", text: merged.message ?? "Erro ao adicionar kit." }));
          return prev;
        }
        setKitClaims((claims) => {
          const next = pruneClaims([...claims, claim], merged.lines);
          return next;
        });
        pendingCartToast.current = {
          tone: "success",
          text:
            claim.economia > 0
              ? `Kit "${claim.nome}" adicionado. Economia de R$ ${claim.economia.toFixed(2).replace(".", ",")}.`
              : `Kit "${claim.nome}" adicionado ao carrinho.`,
        };
        return merged.lines;
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
        return prev.map((l) => (l.id === productId ? { ...l, quantity: l.quantity + 1 } : l));
      });
    },
    [showToast],
  );

  const decrement = useCallback((productId: string) => {
    setLines((prev) => {
      const next = prev
        .map((l) => (l.id === productId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0);
      setKitClaims((claims) => pruneClaims(claims, next));
      return next;
    });
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.id !== productId);
      setKitClaims((claims) => pruneClaims(claims, next));
      return next;
    });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.valor * l.quantity, 0);
    const validClaims = pruneClaims(kitClaims, lines);
    const kitDesconto = validClaims.reduce((s, c) => s + (c.economia || 0), 0);
    return {
      lines,
      kitClaims: validClaims,
      itemCount,
      subtotal,
      kitDesconto,
      subtotalComKits: Math.max(0, subtotal - kitDesconto),
      isReady: ready,
      addProduct,
      addProducts,
      addKit,
      increment,
      decrement,
      removeProduct,
    };
  }, [lines, kitClaims, ready, addProduct, addProducts, addKit, increment, decrement, removeProduct]);

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

export { claimStillValid };
