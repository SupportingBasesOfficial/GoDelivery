"use server";

import { createServerClient, createAdminClient, ok, err } from "@repo/supabase";
import type { Result } from "@repo/supabase";
import { revalidatePath } from "next/cache";
import { rateLimit } from "../lib/rate-limit";
import { validate, createCourierSchema, updateCourierSchema } from "./schemas";

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
 * Lista os entregadores do tenant do usuário logado.
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
 * Cria um novo entregador (auth user + profile + courier record).
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
    return err(courierError.message ?? "Falha ao criar entregador", "courier/create-failed");
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
  statusReason: string | null;
}

/**
 * Lista entregadores com localizacao atual.
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
      id, status, status_reason, vehicle_type, vehicle_plate,
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
    statusReason: c.status_reason ?? null,
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
    console.error("[getTenantLocation] tenantError:", tenantError);
    return err(tenantError.message, "tenant/fetch-failed");
  }

  console.log("[getTenantLocation] tenant:", tenant);

  return ok({
    address: tenant?.address ?? null,
    lat: tenant?.latitude ?? null,
    lng: tenant?.longitude ?? null,
  });
}

/**
 * Busca um entregador pelo ID (do mesmo tenant).
 */
export async function getCourier(courierId: string): Promise<Result<CourierData>> {
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

  const { data: courier, error: courierError } = await supabase
    .from("couriers")
    .select("id, status, license_number, vehicle_plate, vehicle_type, profiles(full_name, phone)")
    .eq("id", courierId)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (courierError || !courier) {
    return err("Entregador não encontrado", "courier/not-found");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profilesArr = (courier as any).profiles as Array<{ full_name?: string; phone?: string }> | null;
  const p = profilesArr?.[0] ?? null;

  return ok({
    id: courier.id,
    fullName: p?.full_name ?? "",
    email: "", // email em auth.users
    phone: p?.phone ?? "",
    licenseNumber: courier.license_number ?? "",
    vehiclePlate: courier.vehicle_plate ?? "",
    vehicleType: courier.vehicle_type ?? "",
    status: courier.status ?? "offline",
  });
}

export interface UpdateCourierData {
  id: string;
  fullName: string;
  phone: string;
  licenseNumber: string;
  vehiclePlate: string;
  vehicleType: string;
}

/**
 * Atualiza dados de um entregador existente (profiles + couriers).
 */
export async function updateCourier(data: UpdateCourierData): Promise<Result<void>> {
  const validation = validate(updateCourierSchema, data);
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

  // Verifica se o courier pertence ao tenant
  const { data: courierCheck, error: checkError } = await supabase
    .from("couriers")
    .select("id")
    .eq("id", data.id)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (checkError || !courierCheck) {
    return err("Entregador não encontrado", "courier/not-found");
  }

  // Atualiza profiles
  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName.trim(),
      phone: data.phone.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (profileUpdateError) {
    return err(profileUpdateError.message, "profile/update-failed");
  }

  // Atualiza couriers
  const { error: courierUpdateError } = await supabase
    .from("couriers")
    .update({
      license_number: data.licenseNumber.trim(),
      vehicle_plate: data.vehiclePlate.trim().toUpperCase(),
      vehicle_type: data.vehicleType.trim().toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (courierUpdateError) {
    return err(courierUpdateError.message, "courier/update-failed");
  }

  revalidatePath("/dashboard/couriers", "page");
  return ok(undefined);
}
