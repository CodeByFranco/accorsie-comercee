export type CepLookupAddress = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

function cepDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

type BrasilApiResponse = {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

async function fromViaCep(cep: string, signal?: AbortSignal): Promise<CepLookupAddress | null> {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal });
  if (!response.ok) throw new Error(`viacep ${response.status}`);
  const data = (await response.json()) as ViaCepResponse;
  if (data.erro) return null;
  return {
    cep,
    logradouro: (data.logradouro ?? "").trim(),
    bairro: (data.bairro ?? "").trim(),
    cidade: (data.localidade ?? "").trim(),
    uf: (data.uf ?? "").trim().toUpperCase(),
  };
}

async function fromBrasilApi(cep: string, signal?: AbortSignal): Promise<CepLookupAddress | null> {
  const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`brasilapi ${response.status}`);
  const data = (await response.json()) as BrasilApiResponse;
  return {
    cep,
    logradouro: (data.street ?? "").trim(),
    bairro: (data.neighborhood ?? "").trim(),
    cidade: (data.city ?? "").trim(),
    uf: (data.state ?? "").trim().toUpperCase(),
  };
}

/** ViaCEP com BrasilAPI de reserva (se o primeiro cair ou ficar indisponível). */
export async function lookupCep(rawCep: string, signal?: AbortSignal): Promise<CepLookupAddress | null> {
  const cep = cepDigits(rawCep);
  if (cep.length !== 8) {
    return null;
  }

  try {
    return await fromViaCep(cep, signal);
  } catch (e) {
    if (signal?.aborted) throw e;
    try {
      return await fromBrasilApi(cep, signal);
    } catch {
      if (signal?.aborted) throw e;
      return null;
    }
  }
}
