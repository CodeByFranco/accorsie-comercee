import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Chave de 32 bytes em base64 (gere com: `openssl rand -base64 32`). */
function chave(): Buffer {
  const raw = process.env.ADMIN_CREDENCIAIS_KEY?.trim();
  if (!raw) throw new Error("Defina ADMIN_CREDENCIAIS_KEY no ambiente do servidor.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ADMIN_CREDENCIAIS_KEY deve ter 32 bytes em base64.");
  return key;
}

/** AES-256-GCM → "v1:iv:tag:dados" (base64). */
export function cifrarSenha(senha: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(senha, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), dados.toString("base64")].join(":");
}

export function decifrarSenha(cifrada: string): string {
  const [v, iv, tag, dados] = cifrada.split(":");
  if (v !== "v1" || !iv || !tag || !dados) throw new Error("Formato de senha inválido.");
  const d = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(dados, "base64")), d.final()]).toString("utf8");
}
