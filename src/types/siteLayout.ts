export type SiteLayoutRow = {
  id: string;
  banner_1_url: string;
  banner_2_url: string;
  banner_3_url: string;
  banner_4_url: string;
  banner_5_url: string;
  banner_6_url: string;
  /** `false` = vitrine fechada (redireciona para /em-construcao), exceto admin logado. */
  loja_publica: boolean;
  updated_at: string;
};
