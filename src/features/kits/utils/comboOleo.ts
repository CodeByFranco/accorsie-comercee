/** Nome da vitrine para os produtos "Kit filtros" vendidos em combo com óleo. */
export const COMBO_OLEO_FILTROS_NOME = "Kits de Troca de Óleo e Filtros";

/** Caminho da página dos combos (catálogo filtrado pelos "Kit filtros"). */
export const COMBO_OLEO_FILTROS_HREF = "/produtos?q=kit+filtros";

/** Produto elegível ao combo com óleo (mesma regra da RPC: título começa com "Kit filtros"). */
export function isKitFiltrosProduto(titulo: string): boolean {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .startsWith("kit filtros");
}
