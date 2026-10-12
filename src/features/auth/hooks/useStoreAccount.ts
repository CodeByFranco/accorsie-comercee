"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/services/supabase/client";

export type StoreAccountUser = {
  email: string;
};

export type StoreGarageVehicle = {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  modelo_id: string | null;
  ano: number | null;
};

/**
 * Conta do visitante na vitrine, lida no navegador (sessão local + RLS "own rows").
 * Mantém o layout público sem `cookies()`/`auth.getUser()` no servidor, que tornava toda página
 * dinâmica e somava idas ao Supabase Auth antes do primeiro byte.
 * `showAdminLink` é só cosmético: rotas /admin continuam protegidas no servidor.
 */
export function useStoreAccount() {
  const [userId, setUserId] = useState<string | null>(null);
  const [accountUser, setAccountUser] = useState<StoreAccountUser | null>(null);
  const [showAdminLink, setShowAdminLink] = useState(false);
  const [garageVehicles, setGarageVehicles] = useState<StoreGarageVehicle[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const user = data.session?.user ?? null;
      setUserId(user?.id ?? null);
      setAccountUser(user ? { email: user.email ?? "" } : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setUserId(user?.id ?? null);
      setAccountUser(user ? { email: user.email ?? "" } : null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshGarage = useCallback(async () => {
    if (!userId) {
      setGarageVehicles([]);
      return;
    }
    const { data } = await createClient()
      .from("garagem_veiculos")
      .select("id, placa, marca, modelo, modelo_id, ano")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setGarageVehicles((data ?? []) as StoreGarageVehicle[]);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- reset ao deslogar */
      setShowAdminLink(false);
      setGarageVehicles([]);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setShowAdminLink(data?.role === "admin");
      });
    void refreshGarage();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshGarage]);

  return { accountUser, showAdminLink, garageVehicles, refreshGarage };
}
