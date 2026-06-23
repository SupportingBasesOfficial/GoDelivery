"use server";

import { createServerClient, ok, err } from "@repo/supabase";
import type { Result, Json } from "@repo/supabase";

export interface FeeRange {
  minKm: number;
  maxKm: number;
  fee: number;
}

export interface TenantSettingsData {
  feeRanges: FeeRange[];
}

/**
 * Busca configurações de taxa do tenant do usuário logado.
 */
export async function getTenantSettings(): Promise<Result<TenantSettingsData>> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return err("Não autenticado", "auth/unauthenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    return err("Perfil não encontrado", "profile/not-found");
  }

  const { data: settings, error: settingsError } = await supabase
    .from("tenant_settings")
    .select("fee_ranges")
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (settingsError) {
    return err(settingsError.message, "settings/fetch-failed");
  }

  return ok({ feeRanges: ((settings?.fee_ranges as unknown) as FeeRange[]) ?? [] });
}

/**
 * Atualiza as faixas de taxa do tenant.
 */
export async function updateTenantSettings(
  data: TenantSettingsData,
): Promise<Result<void>> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return err("Não autenticado", "auth/unauthenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    return err("Perfil não encontrado", "profile/not-found");
  }

  const { error } = await supabase
    .from("tenant_settings")
    .update({ fee_ranges: data.feeRanges as unknown as Json })
    .eq("tenant_id", profile.tenant_id);

  if (error) {
    return err(error.message, "settings/update-failed");
  }

  return ok(undefined);
}
