"use client";

import { PedidosListSection } from "@/features/pedidos/components/PedidosListSection";
import type { PedidoListRow } from "@/types/pedido";
import Link from "next/link";
import { useActionState, useId, useMemo, useRef, useState } from "react";

import {
  AccountSidebarLayout,
  type AccountSectionId,
} from "@/features/auth/components/AccountSidebarLayout";
import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from "@/config/legalDocuments";
import {
  signOutAction,
  updateProfileEndereco,
  updateProfileNome,
  type UpdateProfileEnderecoState,
  type UpdateProfileNomeState,
} from "@/features/auth/services/accountActions";
import { lookupCep } from "@/features/endereco/services/lookupCep";
import type { ProfileEndereco } from "@/types/profileDelivery";

const inputClass =
  "mt-1 block w-full rounded-md border border-store-line bg-white px-3 py-2 text-sm text-store-navy shadow-sm outline-none transition placeholder:text-store-navy-muted/70 focus:border-store-navy focus:ring-1 focus:ring-store-navy";

type AccountAreaContentProps = {
  initialNomeCompleto: string;
  email: string;
  initialEndereco: ProfileEndereco;
  garageVehicles: {
    id: number;
    placa: string;
    marca: string | null;
    modelo: string | null;
    ano: number | null;
    modelo_id: string | null;
  }[];
  initialSection?: AccountSectionId;
  showAdminLink?: boolean;
  pedidos: PedidoListRow[];
};

const initialUpdateState: UpdateProfileNomeState = null;

export function AccountAreaContent({
  initialNomeCompleto,
  email,
  initialEndereco,
  garageVehicles,
  initialSection = "conta",
  showAdminLink = false,
  pedidos,
}: AccountAreaContentProps) {
  const baseId = useId();
  const idNome = `${baseId}-nome`;
  const [updateState, updateAction, updatePending] = useActionState(
    updateProfileNome,
    initialUpdateState
  );

  const [enderecoState, enderecoAction, enderecoPending] = useActionState(
    updateProfileEndereco,
    null as UpdateProfileEnderecoState
  );
  const enderecoFormRef = useRef<HTMLFormElement | null>(null);
  const [cepLookupState, setCepLookupState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });
  const [garageList, setGarageList] = useState(garageVehicles);
  const [deletingGarageId, setDeletingGarageId] = useState<number | null>(null);
  const [garageFeedback, setGarageFeedback] = useState<string | null>(null);

  const enderecoFormKey = useMemo(
    () =>
      [
        initialEndereco.telefone,
        initialEndereco.cep,
        initialEndereco.logradouro,
        initialEndereco.numero,
        initialEndereco.complemento,
        initialEndereco.bairro,
        initialEndereco.cidade,
        initialEndereco.uf,
      ].join("|"),
    [initialEndereco]
  );

  const enderecoFieldErrors =
    enderecoState && !enderecoState.ok && enderecoState.fieldErrors ? enderecoState.fieldErrors : {};

  async function handleEnderecoCepBlur(rawCep: string) {
    const form = enderecoFormRef.current;
    if (!form) return;
    const digits = rawCep.replace(/\D/g, "").slice(0, 8);
    if (digits.length !== 8) {
      setCepLookupState({ loading: false, error: null });
      return;
    }
    setCepLookupState({ loading: true, error: null });
    const data = await lookupCep(digits).catch(() => null);
    if (!data) {
      setCepLookupState({ loading: false, error: "Nao foi possivel localizar este CEP." });
      return;
    }

    const logradouroInput = form.elements.namedItem("logradouro") as HTMLInputElement | null;
    const bairroInput = form.elements.namedItem("bairro") as HTMLInputElement | null;
    const cidadeInput = form.elements.namedItem("cidade") as HTMLInputElement | null;
    const ufInput = form.elements.namedItem("uf") as HTMLInputElement | null;
    if (logradouroInput && !logradouroInput.value.trim()) logradouroInput.value = data.logradouro;
    if (bairroInput && !bairroInput.value.trim()) bairroInput.value = data.bairro;
    if (cidadeInput && !cidadeInput.value.trim()) cidadeInput.value = data.cidade;
    if (ufInput && !ufInput.value.trim()) ufInput.value = data.uf;
    setCepLookupState({ loading: false, error: null });
  }

  const nomeError =
    updateState && !updateState.ok && updateState.fieldError ? updateState.fieldError : undefined;
  const formError = updateState && !updateState.ok && !updateState.fieldError ? updateState.message : null;
  const showOk = updateState?.ok === true;

  const nomeTrim = initialNomeCompleto.trim();
  const firstName = nomeTrim.split(/\s+/)[0] || "Cliente";
  const avatarLetter = (nomeTrim[0] ?? email[0] ?? "?").toUpperCase();

  const contaPanel = (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-store-line/70 bg-gradient-to-br from-store-subtle/45 to-white p-5 shadow-sm sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div
          className="flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-full bg-store-navy text-2xl font-bold tracking-tight text-white shadow-inner ring-4 ring-white/80"
          aria-hidden
        >
          {avatarLetter}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-tight text-store-navy">
            Olá, {firstName}
          </p>
          <p className="mt-1 truncate text-sm text-store-navy-muted" title={email}>
            {email}
          </p>
          {showAdminLink ? (
            <p className="mt-3">
              <Link
                href="/admin"
                className="text-sm font-semibold text-store-accent underline-offset-2 hover:underline"
              >
                Painel administrativo
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      <section
        className="rounded-xl border border-store-line/70 bg-white p-5 shadow-sm sm:p-6"
        aria-labelledby={`${baseId}-dados-heading`}
      >
        <h3 id={`${baseId}-dados-heading`} className="text-base font-semibold text-store-navy">
          Dados pessoais
        </h3>
        <p className="mt-1 text-sm text-store-navy-muted">
          Informações usadas em pedidos e comunicações da loja.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor={`${baseId}-email`} className="text-sm font-medium text-store-navy">
              E-mail
            </label>
            <input
              id={`${baseId}-email`}
              type="email"
              readOnly
              autoComplete="email"
              value={email}
              className={`${inputClass} cursor-not-allowed bg-store-subtle/80 text-store-navy-muted`}
              aria-readonly="true"
            />
            <p className="mt-1 text-xs text-store-navy-muted">O e-mail da conta não pode ser alterado aqui.</p>
          </div>

          <form action={updateAction} className="space-y-4 border-t border-store-line/60 pt-5">
            {formError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {formError}
              </p>
            ) : null}
            {showOk ? (
              <p
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
                role="status"
              >
                Nome atualizado.
              </p>
            ) : null}

            <div>
              <label htmlFor={idNome} className="text-sm font-medium text-store-navy">
                Nome completo
              </label>
              <input
                id={idNome}
                name="nome_completo"
                type="text"
                autoComplete="name"
                defaultValue={initialNomeCompleto}
                className={inputClass}
                aria-invalid={Boolean(nomeError)}
                aria-describedby={nomeError ? `${idNome}-err` : undefined}
              />
              {nomeError ? (
                <p id={`${idNome}-err`} className="mt-1 text-xs text-red-700" role="alert">
                  {nomeError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={updatePending}
                className="mt-4 rounded-md bg-store-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-store-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatePending ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section
        className="rounded-xl border border-store-line/70 bg-white p-5 shadow-sm sm:p-6"
        aria-labelledby={`${baseId}-entrega-heading`}
      >
        <h3 id={`${baseId}-entrega-heading`} className="text-base font-semibold text-store-navy">
          Endereço de entrega
        </h3>
        <p className="mt-1 text-sm text-store-navy-muted">
          Salve um endereço padrão para pré-preencher o checkout. Você poderá alterar na hora da compra. Para remover,
          esvazie todos os campos e clique em salvar.
        </p>

        <form key={enderecoFormKey} ref={enderecoFormRef} action={enderecoAction} className="mt-6 space-y-4">
          {enderecoState && !enderecoState.ok ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {enderecoState.message}
            </p>
          ) : null}
          {enderecoState?.ok === true ? (
            <p
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              role="status"
            >
              {enderecoState.cleared ? "Endereço removido do perfil." : "Endereço salvo."}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${baseId}-ent-tel`} className="text-sm font-medium text-store-navy">
                Telefone / WhatsApp
              </label>
              <input
                id={`${baseId}-ent-tel`}
                name="telefone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                defaultValue={initialEndereco.telefone}
                className={inputClass}
                aria-invalid={Boolean(enderecoFieldErrors.telefone)}
                aria-describedby={enderecoFieldErrors.telefone ? `${baseId}-ent-tel-err` : undefined}
              />
              {enderecoFieldErrors.telefone ? (
                <p id={`${baseId}-ent-tel-err`} className="mt-1 text-xs text-red-700" role="alert">
                  {enderecoFieldErrors.telefone}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor={`${baseId}-ent-cep`} className="text-sm font-medium text-store-navy">
                CEP
              </label>
              <input
                id={`${baseId}-ent-cep`}
                name="cep"
                autoComplete="postal-code"
                inputMode="numeric"
                defaultValue={initialEndereco.cep}
                onBlur={(e) => {
                  void handleEnderecoCepBlur(e.currentTarget.value);
                }}
                className={inputClass}
                aria-invalid={Boolean(enderecoFieldErrors.cep)}
                aria-describedby={enderecoFieldErrors.cep ? `${baseId}-ent-cep-err` : undefined}
              />
              {enderecoFieldErrors.cep ? (
                <p id={`${baseId}-ent-cep-err`} className="mt-1 text-xs text-red-700" role="alert">
                  {enderecoFieldErrors.cep}
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${baseId}-ent-log`} className="text-sm font-medium text-store-navy">
                Logradouro
              </label>
              <input
                id={`${baseId}-ent-log`}
                name="logradouro"
                autoComplete="address-line1"
                defaultValue={initialEndereco.logradouro}
                className={inputClass}
                aria-invalid={Boolean(enderecoFieldErrors.logradouro)}
                aria-describedby={enderecoFieldErrors.logradouro ? `${baseId}-ent-log-err` : undefined}
              />
              {enderecoFieldErrors.logradouro ? (
                <p id={`${baseId}-ent-log-err`} className="mt-1 text-xs text-red-700" role="alert">
                  {enderecoFieldErrors.logradouro}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor={`${baseId}-ent-num`} className="text-sm font-medium text-store-navy">
                Número
              </label>
              <input
                id={`${baseId}-ent-num`}
                name="numero"
                autoComplete="address-line2"
                defaultValue={initialEndereco.numero}
                className={inputClass}
                aria-invalid={Boolean(enderecoFieldErrors.numero)}
                aria-describedby={enderecoFieldErrors.numero ? `${baseId}-ent-num-err` : undefined}
              />
              {enderecoFieldErrors.numero ? (
                <p id={`${baseId}-ent-num-err`} className="mt-1 text-xs text-red-700" role="alert">
                  {enderecoFieldErrors.numero}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor={`${baseId}-ent-comp`} className="text-sm font-medium text-store-navy">
                Complemento <span className="font-normal text-store-navy-muted">(opcional)</span>
              </label>
              <input
                id={`${baseId}-ent-comp`}
                name="complemento"
                autoComplete="off"
                defaultValue={initialEndereco.complemento}
                className={inputClass}
                aria-invalid={Boolean(enderecoFieldErrors.complemento)}
                aria-describedby={enderecoFieldErrors.complemento ? `${baseId}-ent-comp-err` : undefined}
              />
              {enderecoFieldErrors.complemento ? (
                <p id={`${baseId}-ent-comp-err`} className="mt-1 text-xs text-red-700" role="alert">
                  {enderecoFieldErrors.complemento}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor={`${baseId}-ent-bairro`} className="text-sm font-medium text-store-navy">
                Bairro
              </label>
              <input
                id={`${baseId}-ent-bairro`}
                name="bairro"
                autoComplete="address-level3"
                defaultValue={initialEndereco.bairro}
                className={inputClass}
                aria-invalid={Boolean(enderecoFieldErrors.bairro)}
                aria-describedby={enderecoFieldErrors.bairro ? `${baseId}-ent-bairro-err` : undefined}
              />
              {enderecoFieldErrors.bairro ? (
                <p id={`${baseId}-ent-bairro-err`} className="mt-1 text-xs text-red-700" role="alert">
                  {enderecoFieldErrors.bairro}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor={`${baseId}-ent-cidade`} className="text-sm font-medium text-store-navy">
                Cidade
              </label>
              <input
                id={`${baseId}-ent-cidade`}
                name="cidade"
                autoComplete="address-level2"
                defaultValue={initialEndereco.cidade}
                className={inputClass}
                aria-invalid={Boolean(enderecoFieldErrors.cidade)}
                aria-describedby={enderecoFieldErrors.cidade ? `${baseId}-ent-cidade-err` : undefined}
              />
              {enderecoFieldErrors.cidade ? (
                <p id={`${baseId}-ent-cidade-err`} className="mt-1 text-xs text-red-700" role="alert">
                  {enderecoFieldErrors.cidade}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor={`${baseId}-ent-uf`} className="text-sm font-medium text-store-navy">
                UF
              </label>
              <input
                id={`${baseId}-ent-uf`}
                name="uf"
                autoComplete="address-level1"
                maxLength={2}
                defaultValue={initialEndereco.uf}
                className={inputClass}
                aria-invalid={Boolean(enderecoFieldErrors.uf)}
                aria-describedby={enderecoFieldErrors.uf ? `${baseId}-ent-uf-err` : undefined}
              />
              {enderecoFieldErrors.uf ? (
                <p id={`${baseId}-ent-uf-err`} className="mt-1 text-xs text-red-700" role="alert">
                  {enderecoFieldErrors.uf}
                </p>
              ) : null}
            </div>
          </div>
          {cepLookupState.loading ? (
            <p className="text-xs text-store-navy-muted">Buscando endereco pelo CEP...</p>
          ) : null}
          {cepLookupState.error ? (
            <p className="text-xs text-red-700" role="alert">
              {cepLookupState.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={enderecoPending}
            className="rounded-md bg-store-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-store-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enderecoPending ? "Salvando…" : "Salvar endereço"}
          </button>
        </form>
      </section>

      <section
        className="overflow-hidden rounded-2xl border border-store-line/70 bg-gradient-to-br from-white via-white to-store-subtle/50 shadow-sm"
        aria-labelledby={`${baseId}-legal-heading`}
      >
        <div className="border-b border-store-line/60 bg-store-subtle/35 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-store-navy/10 text-store-navy"
              aria-hidden
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </span>
            <div>
              <h3 id={`${baseId}-legal-heading`} className="text-base font-semibold text-store-navy">
                Termos e políticas
              </h3>
              <p className="mt-0.5 text-sm text-store-navy-muted">
                Documentos em vigor para a sua conta e o uso da loja.
              </p>
            </div>
          </div>
        </div>
        <ul className="divide-y divide-store-line/50">
          <li>
            <Link
              href="/termos"
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-store-subtle/45 focus-visible:bg-store-subtle/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-store-navy/25 sm:px-6"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-store-navy/12 to-store-navy/6 text-store-navy ring-1 ring-store-navy/10"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                  />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-store-navy transition group-hover:text-store-accent">
                  Termos de uso
                </span>
                <span className="mt-1 inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-store-navy-muted ring-1 ring-store-line/70">
                  Versão {LEGAL_TERMS_VERSION}
                </span>
              </span>
              <svg
                className="h-5 w-5 shrink-0 text-store-navy-muted transition group-hover:translate-x-0.5 group-hover:text-store-navy"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </li>
          <li>
            <Link
              href="/privacidade"
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-store-subtle/45 focus-visible:bg-store-subtle/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-store-navy/25 sm:px-6"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-store-accent/20 to-store-accent/8 text-store-navy ring-1 ring-store-accent/25"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-store-navy transition group-hover:text-store-accent">
                  Política de Privacidade
                </span>
                <span className="mt-1 inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-store-navy-muted ring-1 ring-store-line/70">
                  Versão {LEGAL_PRIVACY_VERSION}
                </span>
              </span>
              <svg
                className="h-5 w-5 shrink-0 text-store-navy-muted transition group-hover:translate-x-0.5 group-hover:text-store-navy"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </li>
        </ul>
      </section>

      <section
        className="rounded-xl border border-store-line/70 bg-store-subtle/20 p-5 sm:p-6"
        aria-labelledby={`${baseId}-senha-heading`}
      >
        <h3 id={`${baseId}-senha-heading`} className="text-base font-semibold text-store-navy">
          Senha e segurança
        </h3>
        <p className="mt-2 text-sm text-store-navy-muted">
          Para alterar a senha, enviaremos um link seguro para o seu e-mail.
        </p>
        <Link
          href="/recuperar-senha"
          className="mt-4 inline-flex rounded-md border border-store-line bg-white px-4 py-2.5 text-sm font-semibold text-store-navy shadow-sm transition hover:bg-store-subtle/80"
        >
          Redefinir senha por e-mail
        </Link>
      </section>

      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full rounded-md border border-store-line bg-white px-4 py-2.5 text-sm font-semibold text-store-navy transition hover:bg-store-subtle/90"
        >
          Sair da conta
        </button>
      </form>
    </div>
  );

  const pedidosPanel = <PedidosListSection pedidos={pedidos} />;

  const suportePanel = (
    <div className="rounded-lg border border-store-line/70 bg-store-subtle/25 px-4 py-6">
      <p className="text-sm text-store-navy-muted">
        Canais de atendimento e conteúdo de ajuda serão publicados aqui em breve. Para dúvidas sobre dados pessoais, use a{" "}
        <Link href="/privacidade" className="font-semibold text-store-navy underline underline-offset-2">
          Política de Privacidade
        </Link>
        .
      </p>
    </div>
  );

  async function handleDeleteGarageVehicle(vehicleId: number) {
    setDeletingGarageId(vehicleId);
    setGarageFeedback(null);
    try {
      const response = await fetch(`/api/garagem?id=${vehicleId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setGarageFeedback(payload.message ?? "Não foi possível excluir o veículo.");
        return;
      }
      setGarageList((prev) => prev.filter((v) => v.id !== vehicleId));
      setGarageFeedback("Veículo removido da garagem.");
    } catch {
      setGarageFeedback("Falha de comunicação ao excluir veículo.");
    } finally {
      setDeletingGarageId(null);
    }
  }

  const garagemPanel = (
    <section
      className="rounded-xl border border-store-line/70 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby={`${baseId}-garagem-heading`}
    >
      <h3 id={`${baseId}-garagem-heading`} className="text-base font-semibold text-store-navy">
        Minha garagem
      </h3>
      <p className="mt-1 text-sm text-store-navy-muted">
        Veículos salvos para você aplicar filtro de peças com um clique.
      </p>

      {garageFeedback ? (
        <p className="mt-3 rounded-md border border-store-line/80 bg-store-subtle/40 px-3 py-2 text-xs text-store-navy">
          {garageFeedback}
        </p>
      ) : null}

      {garageList.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-store-line/90 bg-store-subtle/20 px-4 py-8 text-center">
          <p className="text-sm font-medium text-store-navy">Você ainda não salvou nenhum veículo.</p>
          <p className="mt-2 text-sm text-store-navy-muted">
            Consulte sua placa na home e use "Adicionar meu veículo à minha garagem".
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {garageList.map((vehicle) => {
            const qs = new URLSearchParams();
            if (vehicle.modelo_id) qs.set("modelo", vehicle.modelo_id);
            if (vehicle.ano != null) qs.set("ano", String(vehicle.ano));
            const filterHref = `/produtos${qs.toString() ? `?${qs.toString()}` : ""}`;

            return (
              <li key={vehicle.id} className="rounded-xl border border-store-line/70 bg-store-subtle/20 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-store-navy">{vehicle.placa}</p>
                <p className="mt-1 text-sm text-store-navy">
                  {vehicle.marca ?? "-"} - {vehicle.modelo ?? "-"} {vehicle.ano ? `(${vehicle.ano})` : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {vehicle.modelo_id ? (
                    <Link
                      href={filterHref}
                      className="inline-flex rounded-md bg-store-navy px-3.5 py-2 text-xs font-bold text-white transition hover:bg-store-navy/90"
                    >
                      Filtrar peças desse veículo
                    </Link>
                  ) : (
                    <p className="text-xs text-store-navy-muted">
                      Este veículo não está vinculado ao catálogo para filtro automático.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteGarageVehicle(vehicle.id);
                    }}
                    disabled={deletingGarageId === vehicle.id}
                    className="inline-flex rounded-md border border-red-300 px-3.5 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingGarageId === vehicle.id ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <AccountSidebarLayout
      conta={contaPanel}
      pedidos={pedidosPanel}
      garagem={garagemPanel}
      suporte={suportePanel}
      initialSection={initialSection}
    />
  );
}
