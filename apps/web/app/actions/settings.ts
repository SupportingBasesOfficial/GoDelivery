"use server";

import { createServerClient, ok, err } from "@repo/supabase";
import type { Result, Json } from "@repo/supabase";
import { validate, tenantSettingsSchema } from "./schemas";

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
  const validation = validate(tenantSettingsSchema, data);
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

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

export interface TenantLocationData {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Busca localizacao do estabelecimento (tenant).
 */
export async function getTenantLocation(): Promise<Result<TenantLocationData>> {
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

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("address, latitude, longitude")
    .eq("id", profile.tenant_id)
    .single();

  if (tenantError) {
    return err(tenantError.message, "tenant/fetch-failed");
  }

  return ok({
    address: tenant?.address ?? "",
    latitude: tenant?.latitude ?? null,
    longitude: tenant?.longitude ?? null,
  });
}

/**
 * Atualiza localizacao do estabelecimento (tenant).
 */
export async function updateTenantLocation(
  data: TenantLocationData,
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
    .from("tenants")
    .update({
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
    })
    .eq("id", profile.tenant_id);

  if (error) {
    return err(error.message, "tenant/update-failed");
  }

  return ok(undefined);
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

/**
 * Geocodifica um endereco via Nominatim (server-side para evitar CSP).
 */
export async function geocodeAddress(
  address: string,
): Promise<Result<GeocodeResult>> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { "User-Agent": "GoDelivery/1.0" } },
    );
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
    }>;
    if (data && data.length > 0) {
      return ok({
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      });
    }
    return err("Endereco nao encontrado", "geocode/not-found");
  } catch {
    return err("Erro ao geocodificar endereco", "geocode/failed");
  }
}
