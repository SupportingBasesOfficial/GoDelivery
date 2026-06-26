"use server";

import { createServerClient, createAdminClient, ok, err } from "@repo/supabase";
import type { Result } from "@repo/supabase";
import { revalidatePath } from "next/cache";
import { rateLimit } from "../lib/rate-limit";
import { validate, createCourierSchema } from "./schemas";

export interface CourierData {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  vehiclePlate: string;
  vehicleType: string;
  status: string;
}

export interface CreateCourierData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  licenseNumber: string;
  vehiclePlate: string;
  vehicleType: string;
}

/**
 * Lista os motoboys do tenant do usuário logado.
 */
export async function listCouriers(): Promise<Result<CourierData[]>> {
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

  const { data: couriers, error: couriersError } = await supabase
    .from("couriers")
    .select("id, status, license_number, vehicle_plate, vehicle_type, profiles(full_name, phone)")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  if (couriersError) {
    return err(couriersError.message, "couriers/fetch-failed");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatted = (couriers ?? []).map((c: any) => ({
    id: c.id,
    fullName: c.profiles?.full_name ?? "",
    email: "", // email fica em auth.users, nao em profiles
    phone: c.profiles?.phone ?? "",
    licenseNumber: c.license_number ?? "",
    vehiclePlate: c.vehicle_plate ?? "",
    vehicleType: c.vehicle_type ?? "",
    status: c.status ?? "offline",
  }));

  return ok(formatted);
}

/**
 * Cria um novo motoboy (auth user + profile + courier record).
 */
export async function createCourier(data: CreateCourierData): Promise<Result<{ userId: string }>> {
  const validation = validate(createCourierSchema, data);
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();
  const admin = createAdminClient();

  // 1. Obter tenant_id do business owner logado (via cookie session)
  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !currentUser) {
    return err("Não autenticado", "auth/unauthenticated");
  }

  const limit = rateLimit(`create-courier:${currentUser.id}`, 5, 60_000);
  if (!limit.allowed) {
    return err("Muitas tentativas. Tente novamente em alguns minutos.", "rate-limit/exceeded");
  }

  const { data: ownerProfile, error: ownerProfileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", currentUser.id)
    .single();

  if (ownerProfileError || !ownerProfile?.tenant_id) {
    return err("Perfil não encontrado", "profile/not-found");
  }

  const tenantId = ownerProfile.tenant_id;

  // 2. Criar auth user para o courier
  const { data: authData, error: signUpError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });

  if (signUpError || !authData.user) {
    return err(signUpError?.message ?? "Falha ao criar usuário", "auth/signup-failed");
  }

  const userId = authData.user.id;

  // 3. Criar profile
  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    tenant_id: tenantId,
    role: "courier",
    full_name: data.fullName,
    phone: data.phone,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return err(profileError.message ?? "Falha ao criar perfil", "profile/create-failed");
  }

  // 4. Criar courier record
  const { error: courierError } = await admin.from("couriers").insert({
    id: userId,
    tenant_id: tenantId,
    license_number: data.licenseNumber,
    vehicle_plate: data.vehiclePlate,
    vehicle_type: data.vehicleType,
    status: "offline",
    total_deliveries: 0,
    total_earnings: 0,
  });

  if (courierError) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("profiles").delete().eq("id", userId);
    return err(courierError.message ?? "Falha ao criar motoboy", "courier/create-failed");
  }

  revalidatePath("/dashboard/couriers", "page");
  return ok({ userId });
}

export interface CourierWithLocation {
  id: string;
  fullName: string;
  email?: string;
  phone: string;
  status: string;
  vehicleType: string | null;
  vehiclePlate: string | null;
  lat: number | null;
  lng: number | null;
  lastLocationAt: string | null;
}

/**
 * Lista motoboys com localização atual.
 */
export async function getCouriersWithLocation(): Promise<Result<CourierWithLocation[]>> {
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

  const { data: couriers, error: couriersError } = await supabase
    .from("couriers")
    .select(
      `
      id, status, vehicle_type, vehicle_plate,
      current_location_lat, current_location_lng, last_location_at,
      profiles (full_name, phone)
      `,
    )
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  if (couriersError) {
    return err(couriersError.message, "couriers/fetch-failed");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatted = (couriers ?? []).map((c: any) => ({
    id: c.id,
    fullName: c.profiles?.full_name ?? "",
    email: "",
    phone: c.profiles?.phone ?? "",
    status: c.status ?? "offline",
    vehicleType: c.vehicle_type ?? null,
    vehiclePlate: c.vehicle_plate ?? null,
    lat: c.current_location_lat ?? null,
    lng: c.current_location_lng ?? null,
    lastLocationAt: c.last_location_at ?? null,
  }));

  return ok(formatted);
}

export interface TenantLocation {
  address: string | null;
  lat: number | null;
  lng: number | null;
}

/**
 * Busca localizacao do estabelecimento (tenant) para centro do mapa.
 */
export async function getTenantLocation(): Promise<Result<TenantLocation>> {
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
    address: tenant?.address ?? null,
    lat: tenant?.latitude ?? null,
    lng: tenant?.longitude ?? null,
  });
}
