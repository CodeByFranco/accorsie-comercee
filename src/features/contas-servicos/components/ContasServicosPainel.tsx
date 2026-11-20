"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  excluirContaServico,
  revelarSenhaContaServico,
  salvarContaServico,
  type ContaServico,
} from "@/features/contas-servicos/services/contasServicos";

const field =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200";
const label = "text-xs font-medium text-gray-600";
const btn = "rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60";

const VAZIA: ContaServico = {
  id: "",
  servico: "",
  email: "",
  temSenha: false,
  link_login: "",
  link_recarga: "",
  observacoes: "",
};

export function ContasServicosPainel({ contas }: { contas: ContaServico[] }) {
  const [nova, setNova] = useState(false);
  return (
    <div className="space-y-4">
      {contas.map((c) => (
        <ContaCard key={c.id} conta={c} />
      ))}
      {nova ? (
        <ContaCard conta={VAZIA} editandoInicial onFechar={() => setNova(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setNova(true)}
          className={`${btn} border border-dashed border-gray-400 text-gray-700 hover:bg-gray-50`}
        >
          + Adicionar conta
        </button>
      )}
    </div>
  );
}

function ContaCard({
  conta,
  editandoInicial = false,
  onFechar,
}: {
  conta: ContaServico;
  editandoInicial?: boolean;
  onFechar?: () => void;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(editandoInicial);
  const [senhaVisivel, setSenhaVisivel] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendente, start] = useTransition();
  const [f, setF] = useState({ ...conta, senha: "", removerSenha: false });

  const copiar = async (texto: string, o_que: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setMsg({ ok: true, text: `${o_que} copiado.` });
    } catch {
      setMsg({ ok: false, text: "Não foi possível copiar." });
    }
  };

  const mostrarSenha = () =>
    start(async () => {
      if (senhaVisivel !== null) {
        setSenhaVisivel(null);
        return;
      }
      const r = await revelarSenhaContaServico(conta.id);
      if (r.ok && r.senha !== undefined) {
        setSenhaVisivel(r.senha);
        window.setTimeout(() => setSenhaVisivel(null), 30_000);
      } else setMsg({ ok: false, text: r.message ?? "Erro." });
    });

  const copiarSenha = () =>
    start(async () => {
      const r = await revelarSenhaContaServico(conta.id);
      if (r.ok && r.senha !== undefined) await copiar(r.senha, "Senha");
      else setMsg({ ok: false, text: r.message ?? "Erro." });
    });

  const salvar = () =>
    start(async () => {
      const r = await salvarContaServico({ ...f, id: conta.id });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setEditando(false);
        setF((x) => ({ ...x, senha: "", removerSenha: false }));
        onFechar?.();
        router.refresh();
      }
    });

  const excluir = () => {
    if (!window.confirm(`Remover a conta "${conta.servico}" do admin? Isso não apaga a conta no serviço.`)) return;
    start(async () => {
      const r = await excluirContaServico(conta.id);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) router.refresh();
    });
  };

  if (editando) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={label}>Serviço</span>
            <input className={field} value={f.servico} onChange={(e) => setF({ ...f, servico: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>E-mail de login</span>
            <input
              className={field}
              type="email"
              autoComplete="off"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={label}>
              Senha {conta.temSenha ? "(deixe em branco para manter a atual)" : ""}
            </span>
            <input
              className={field}
              type="password"
              autoComplete="new-password"
              value={f.senha}
              disabled={f.removerSenha}
              onChange={(e) => setF({ ...f, senha: e.target.value })}
            />
            {conta.temSenha ? (
              <span className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={f.removerSenha}
                  onChange={(e) => setF({ ...f, removerSenha: e.target.checked, senha: "" })}
                />
                Remover a senha salva
              </span>
            ) : null}
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Link para entrar</span>
            <input
              className={field}
              placeholder="https://"
              value={f.link_login}
              onChange={(e) => setF({ ...f, link_login: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Link para pôr saldo</span>
            <input
              className={field}
              placeholder="https://"
              value={f.link_recarga}
              onChange={(e) => setF({ ...f, link_recarga: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={label}>Observações</span>
            <textarea
              className={`${field} min-h-20`}
              value={f.observacoes}
              onChange={(e) => setF({ ...f, observacoes: e.target.value })}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pendente}
            onClick={salvar}
            className={`${btn} bg-gray-900 text-white hover:bg-gray-800`}
          >
            {pendente ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditando(false);
              setF({ ...conta, senha: "", removerSenha: false });
              onFechar?.();
            }}
            className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`}
          >
            Cancelar
          </button>
        </div>
        {msg ? <p className={`mt-2 text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900">{conta.servico}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`}
          >
            Editar
          </button>
          <button type="button" onClick={excluir} className={`${btn} text-red-700 hover:bg-red-50`}>
            Remover
          </button>
        </div>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="text-gray-500">E-mail</dt>
        <dd className="flex flex-wrap items-center gap-2 text-gray-900">
          {conta.email || <span className="text-gray-400">não informado</span>}
          {conta.email ? (
            <button type="button" onClick={() => copiar(conta.email, "E-mail")} className="text-xs font-semibold text-blue-700 hover:underline">
              copiar
            </button>
          ) : null}
        </dd>
        <dt className="text-gray-500">Senha</dt>
        <dd className="flex flex-wrap items-center gap-2 text-gray-900">
          {conta.temSenha ? (
            <>
              <span className="font-mono">{senhaVisivel ?? "••••••••"}</span>
              <button type="button" disabled={pendente} onClick={mostrarSenha} className="text-xs font-semibold text-blue-700 hover:underline">
                {senhaVisivel !== null ? "esconder" : "mostrar"}
              </button>
              <button type="button" disabled={pendente} onClick={copiarSenha} className="text-xs font-semibold text-blue-700 hover:underline">
                copiar
              </button>
            </>
          ) : (
            <span className="text-gray-400">não salva</span>
          )}
        </dd>
        {conta.observacoes ? (
          <>
            <dt className="text-gray-500">Observações</dt>
            <dd className="whitespace-pre-line text-gray-900">{conta.observacoes}</dd>
          </>
        ) : null}
      </dl>

      {conta.link_login || conta.link_recarga ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {conta.link_login ? (
            <a
              href={conta.link_login}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`}
            >
              Entrar na conta ↗
            </a>
          ) : null}
          {conta.link_recarga ? (
            <a
              href={conta.link_recarga}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn} bg-orange-500 text-white hover:bg-orange-600`}
            >
              Pôr saldo ↗
            </a>
          ) : null}
        </div>
      ) : null}
      {msg ? <p className={`mt-2 text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p> : null}
    </div>
  );
}
