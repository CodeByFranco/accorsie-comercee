"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { createClient } from "@/services/supabase/client";

import { mapSupabaseAuthError } from "../utils/mapSupabaseAuthError";
import { validateLogin } from "../utils/authValidation";

const inputClassBase =
  "block w-full rounded-md border border-store-line bg-white px-3 py-2 text-sm text-store-navy shadow-sm outline-none transition placeholder:text-store-navy-muted/70 focus:border-store-navy focus:ring-1 focus:ring-store-navy";

const inputClass = `mt-1 ${inputClassBase}`;

function callbackErrorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === "missing_code") {
    return "O link de acesso é inválido ou expirou. Solicite um novo e-mail ou entre com e-mail e senha.";
  }
  if (code === "auth_callback") {
    return "Não foi possível concluir o login pelo link. Tente novamente ou use e-mail e senha.";
  }
  return null;
}

type LoginFormProps = {
  initialErrorCode?: string | null;
  initialNext?: string | null;
};

export function LoginForm({ initialErrorCode, initialNext }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const baseId = useId();
  const idEmail = `${baseId}-email`;
  const idSenha = `${baseId}-senha`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof validateLogin>>({});
  const [formError, setFormError] = useState<string | null>(() => callbackErrorMessage(initialErrorCode ?? null));
  const [pending, setPending] = useState(false);

  const nextFromUrl = searchParams.get("next") ?? initialNext ?? null;

  useEffect(() => {
    const err = searchParams.get("error");
    const msg = callbackErrorMessage(err);
    if (msg) {
      setFormError(msg);
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const errors = validateLogin({ email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setPending(false);

    if (error) {
      setFormError(mapSupabaseAuthError(error));
      return;
    }

    const next =
      nextFromUrl && nextFromUrl.startsWith("/") && !nextFromUrl.startsWith("//") ? nextFromUrl : "/conta";
    router.push(next);
    router.refresh();
  }

  const recuperarHref =
    nextFromUrl && nextFromUrl.startsWith("/")
      ? `/recuperar-senha?next=${encodeURIComponent(nextFromUrl)}`
      : "/recuperar-senha";

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {formError}
        </p>
      ) : null}

      <div>
        <label htmlFor={idEmail} className="text-sm font-medium text-store-navy">
          E-mail
        </label>
        <input
          id={idEmail}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? `${idEmail}-err` : undefined}
        />
        {fieldErrors.email ? (
          <p id={`${idEmail}-err`} className="mt-1 text-xs text-red-700" role="alert">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={idSenha} className="text-sm font-medium text-store-navy">
            Senha
          </label>
          <Link
            href={recuperarHref}
            className="text-xs font-semibold text-store-navy underline underline-offset-2"
          >
            Esqueci minha senha
          </Link>
        </div>
        <div className="relative mt-1">
          <input
            id={idSenha}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClassBase} pr-10`}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? `${idSenha}-err` : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-store-navy-muted outline-none transition hover:bg-store-line/40 hover:text-store-navy focus-visible:ring-2 focus-visible:ring-store-navy"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m12.415 5.586a11.983 11.983 0 0 1 0 3.414m-9.192 8.192L3 3"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
        </div>
        {fieldErrors.password ? (
          <p id={`${idSenha}-err`} className="mt-1 text-xs text-red-700" role="alert">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center rounded-md bg-store-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-store-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>

      <div className="flex items-center justify-center gap-3">
        <p className="text-sm text-store-navy-muted">Não tem conta?</p>
        <Link
          href={nextFromUrl ? `/cadastro?next=${encodeURIComponent(nextFromUrl)}` : "/cadastro"}
          className="inline-flex items-center justify-center rounded-md bg-store-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-store-navy/90"
        >
          Cadastre-se
        </Link>
      </div>
    </form>
  );
}
