import { Poppins } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { storeShellContent, storeShellInset } from "@/config/storeShell";

const poppins = Poppins({ subsets: ["latin"], weight: ["800"] });

type RetornoStatus = "success" | "pending" | "failure" | "unknown";

function normalizeStatus(raw: string | undefined): RetornoStatus {
  if (raw === "success" || raw === "pending" || raw === "failure") {
    return raw;
  }
  return "unknown";
}

const copy: Record<
  RetornoStatus,
  { title: string; body: string; tone: "ok" | "warn" | "err" | "neutral" }
> = {
  success: {
    title: "Pagamento em análise ou aprovado",
    body: "Obrigado pela compra. O status final do pedido é confirmado pelo Mercado Pago e pode levar alguns instantes. Você pode acompanhar em Minha conta quando os pedidos estiverem disponíveis.",
    tone: "ok",
  },
  pending: {
    title: "Pagamento pendente",
    body: "Seu pagamento ainda está sendo processado. Assim que houver confirmação, atualizaremos o status do pedido. Não é necessário tentar pagar novamente enquanto o status estiver pendente.",
    tone: "warn",
  },
  failure: {
    title: "Pagamento não concluído",
    body: "Não foi possível concluir o pagamento nesta tentativa. Você pode revisar o carrinho e tentar novamente, ou escolher outro meio de pagamento no checkout.",
    tone: "err",
  },
  unknown: {
    title: "Retorno do checkout",
    body: "Você voltou da página de pagamento. O estado final do pedido é atualizado automaticamente; se algo parecer incorreto, aguarde alguns minutos ou entre em contato com o suporte.",
    tone: "neutral",
  },
};

const toneBorder: Record<(typeof copy)[RetornoStatus]["tone"], string> = {
  ok: "border-blue-200 bg-blue-50/90",
  warn: "border-amber-200 bg-amber-50/90",
  err: "border-red-200 bg-red-50/90",
  neutral: "border-store-line/80 bg-white",
};

export default async function CheckoutRetornoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const statusRaw = sp.status;
  const statusParam = typeof statusRaw === "string" ? statusRaw : undefined;
  const status = normalizeStatus(statusParam);
  const { title, body, tone } = copy[status];

  return (
    <div className="flex min-h-dvh flex-col bg-store-cream font-sans text-store-navy">
      <main className={`flex flex-1 flex-col py-10 sm:py-14 ${storeShellInset}`}>
        <div className={storeShellContent}>
          <div
            className={`mx-auto w-full max-w-lg rounded-lg border p-6 shadow-sm sm:p-8 ${toneBorder[tone]}`}
          >
            <h1 className="text-center text-xl font-bold tracking-tight text-black sm:text-2xl">{title}</h1>
            <p className="mt-3 text-justify text-sm leading-relaxed text-store-navy">{body}</p>
            {status !== "failure" ? (
              <div className="relative mt-5 overflow-hidden rounded-2xl border-2 border-store-accent bg-gradient-to-br from-store-navy via-store-navy-muted to-store-navy px-5 py-6 text-center text-sm leading-relaxed text-white shadow-lg">
                <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-store-accent/25 blur-2xl" />
                <span aria-hidden className="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-store-accent/20 blur-2xl" />
                <div className="relative">
                  <Image
                    src="/icons/presente.png"
                    alt=""
                    width={56}
                    height={56}
                    className="mx-auto h-14 w-14 drop-shadow-md"
                  />
                  <p className={`${poppins.className} mt-2 text-lg font-extrabold uppercase leading-tight text-store-accent sm:text-xl`}>
                    Um presente especial para você!
                  </p>
                  <p className="mt-3 font-semibold">Aqui na Accorsi Auto Peças, cada detalhe importa!</p>
                  <p className="mt-2 text-white/85">
                    Por isso,{" "}
                    <span className="font-semibold text-white underline decoration-store-accent decoration-2 underline-offset-4">
                      todo pedido acompanha um brinde especial
                    </span>
                    , preparado com carinho para agradecer pela sua confiança e preferência.
                  </p>
                  <p className="mt-4 inline-block rounded-full bg-store-accent px-4 py-1.5 text-sm font-bold text-store-navy shadow-md">
                    Obrigado por escolher a Accorsi!
                  </p>
                </div>
              </div>
            ) : null}
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center [&>a]:w-full [&>a]:max-w-xs sm:[&>a]:w-auto">
              <Link
                href="/carrinho"
                className="inline-flex flex-1 items-center justify-center rounded-md bg-store-navy px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-store-navy/90 sm:flex-none sm:min-w-[10rem]"
              >
                Ver carrinho
              </Link>
              <Link
                href="/conta"
                className="inline-flex flex-1 items-center justify-center rounded-md border border-store-line bg-white px-4 py-2.5 text-center text-sm font-semibold text-store-navy transition hover:bg-store-subtle sm:flex-none sm:min-w-[10rem]"
              >
                Minha conta
              </Link>
              <Link
                href="/produtos"
                className="inline-flex flex-1 items-center justify-center rounded-md border border-transparent px-4 py-2.5 text-center text-sm font-semibold text-store-navy underline-offset-4 hover:underline sm:flex-none"
              >
                Continuar comprando
              </Link>
            </div>
            <p className="mt-6 border-t border-store-line/60 pt-4 text-center text-xs leading-relaxed text-store-navy/70">
              Ficou com alguma dúvida sobre o seu pedido?{" "}
              <a
                href="https://wa.me/5554999343052"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
              >
                Fale com o vendedor pelo WhatsApp
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
