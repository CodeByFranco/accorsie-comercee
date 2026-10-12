import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { MAINTENANCE_MODE, isMaintenanceBypassPath } from "@/lib/siteMaintenance";

const ADMIN_LOGIN = "/admin/login";

function isProtectedAdminRoute(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false;
  if (pathname === ADMIN_LOGIN || pathname.startsWith(`${ADMIN_LOGIN}/`)) return false;
  return true;
}

/**
 * Vitrine pública (catálogo/produto/kit/institucionais): não lê sessão no servidor — dados vêm do
 * cache público e a conta é lida no navegador. Pular o Supabase Auth aqui evita uma ida à rede
 * por requisição. Demais rotas (conta, checkout, pedidos, admin, API) seguem renovando a sessão.
 */
function isPublicCatalogRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "/produtos") return true;
  if (/^\/produtos\/[^/]+\/?$/.test(pathname)) return true;
  if (pathname.startsWith("/kit/")) return true;
  return ["/sobre", "/termos", "/privacidade", "/em-construcao"].includes(pathname);
}

function applyResponseCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
  return to;
}

function serviceUnavailableResponse(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const isApi =
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/integrations/melhor-envio");
  if (isApi) {
    return NextResponse.json(
      { error: "Serviço de autenticação indisponível." },
      { status: 503 },
    );
  }
  return new NextResponse(
    "Serviço temporariamente indisponível (configuração incompleta).",
    {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  if (!MAINTENANCE_MODE && isPublicCatalogRoute(pathname)) {
    return response;
  }

  const needsAdmin =
    isProtectedAdminRoute(pathname) ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/fipe") ||
    pathname.startsWith("/api/integrations/melhor-envio");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (needsAdmin) {
      return serviceUnavailableResponse(request);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([headerName, value]) =>
          response.headers.set(headerName, value)
        );
      },
    },
  });

  const { data: authData } = await supabase.auth.getUser();

  const user = authData.user;
  let profileRole: string | null | undefined;

  const getProfileRole = async (): Promise<string | null> => {
    if (!user) return null;
    if (profileRole !== undefined) return profileRole;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const resolved: string | null = profile?.role ?? null;
    profileRole = resolved;
    return resolved;
  };

  if (MAINTENANCE_MODE && !isMaintenanceBypassPath(pathname)) {
    const isApi = pathname.startsWith("/api/");
    if (!user) {
      if (isApi) {
        return NextResponse.json(
          { error: "Loja em preparação." },
          { status: 503 },
        );
      }
      const dest = new URL("/em-construcao", request.url);
      return applyResponseCookies(response, NextResponse.redirect(dest));
    }

    const role = await getProfileRole();

    if (role !== "admin") {
      if (isApi) {
        return NextResponse.json(
          { error: "Loja em preparação." },
          { status: 503 },
        );
      }
      const dest = new URL("/em-construcao", request.url);
      return applyResponseCookies(response, NextResponse.redirect(dest));
    }
  }

  if (needsAdmin) {
    if (!user) {
      if (
        pathname.startsWith("/api/integrations/melhor-envio") &&
        request.method === "GET"
      ) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.searchParams.set(
          "next",
          `${pathname}${request.nextUrl.search}`,
        );
        const redirect = NextResponse.redirect(loginUrl);
        return applyResponseCookies(response, redirect);
      }
      if (
        pathname.startsWith("/api/admin") ||
        pathname.startsWith("/api/integrations/melhor-envio")
      ) {
        return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set(
        "next",
        `${pathname}${request.nextUrl.search}`
      );
      const redirect = NextResponse.redirect(loginUrl);
      return applyResponseCookies(response, redirect);
    }

    const role = await getProfileRole();

    if (role !== "admin") {
      if (
        pathname.startsWith("/api/admin") ||
        pathname.startsWith("/api/integrations/melhor-envio")
      ) {
        return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
      }
      const home = new URL("/", request.url);
      const redirect = NextResponse.redirect(home);
      return applyResponseCookies(response, redirect);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
