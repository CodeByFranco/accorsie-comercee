/**
 * Endereço da loja para pedidos "retirada na loja" (sem envio pelos Correios / Melhor Envio).
 * Usa variáveis NEXT_PUBLIC_* para o mesmo valor no servidor (Server Action) e no cliente (checkout).
 */
export type StorePickupAddress = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

/**
 * Acesso estático obrigatório: o Next só embute NEXT_PUBLIC_* no bundle do cliente
 * quando a chave aparece literalmente (process.env[key] dinâmico vira undefined no navegador).
 */
const ENV = {
  NEXT_PUBLIC_LOJA_RETIRADA_CEP: process.env.NEXT_PUBLIC_LOJA_RETIRADA_CEP,
  NEXT_PUBLIC_LOJA_RETIRADA_LOGRADOURO: process.env.NEXT_PUBLIC_LOJA_RETIRADA_LOGRADOURO,
  NEXT_PUBLIC_LOJA_RETIRADA_NUMERO: process.env.NEXT_PUBLIC_LOJA_RETIRADA_NUMERO,
  NEXT_PUBLIC_LOJA_RETIRADA_COMPLEMENTO: process.env.NEXT_PUBLIC_LOJA_RETIRADA_COMPLEMENTO,
  NEXT_PUBLIC_LOJA_RETIRADA_BAIRRO: process.env.NEXT_PUBLIC_LOJA_RETIRADA_BAIRRO,
  NEXT_PUBLIC_LOJA_RETIRADA_CIDADE: process.env.NEXT_PUBLIC_LOJA_RETIRADA_CIDADE,
  NEXT_PUBLIC_LOJA_RETIRADA_UF: process.env.NEXT_PUBLIC_LOJA_RETIRADA_UF,
} as const;

function read(key: keyof typeof ENV): string {
  return ENV[key]?.trim() ?? "";
}

export function getStorePickupAddress(): StorePickupAddress | null {
  const cep = read("NEXT_PUBLIC_LOJA_RETIRADA_CEP").replace(/\D/g, "").slice(0, 8);
  const logradouro = read("NEXT_PUBLIC_LOJA_RETIRADA_LOGRADOURO");
  const numero = read("NEXT_PUBLIC_LOJA_RETIRADA_NUMERO");
  const bairro = read("NEXT_PUBLIC_LOJA_RETIRADA_BAIRRO");
  const cidade = read("NEXT_PUBLIC_LOJA_RETIRADA_CIDADE");
  const uf = read("NEXT_PUBLIC_LOJA_RETIRADA_UF").toUpperCase().slice(0, 2);

  if (
    cep.length !== 8 ||
    !logradouro ||
    !numero ||
    !bairro ||
    !cidade ||
    uf.length !== 2
  ) {
    return null;
  }

  return {
    cep,
    logradouro,
    numero,
    complemento: read("NEXT_PUBLIC_LOJA_RETIRADA_COMPLEMENTO"),
    bairro,
    cidade,
    uf,
  };
}

export function formatStorePickupAddress(a: StorePickupAddress): string {
  const comp = a.complemento ? ` — ${a.complemento}` : "";
  return `${a.logradouro}, ${a.numero}${comp} — ${a.bairro}, ${a.cidade}/${a.uf} — CEP ${a.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}`;
}
