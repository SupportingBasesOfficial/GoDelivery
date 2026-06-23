"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient, ok, err } from "@repo/supabase";
import type { Result } from "@repo/supabase";
import { rateLimit } from "../lib/rate-limit";

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  tenantName: string;
  tenantSlug: string;
  phone: string;
}

interface SignInData {
  email: string;
  password: string;
}

interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
  fullName: string | null;
}

/**
 * Cadastro de empresário com criação de tenant e profile.
 * Usa Service Role Key para criar profile/tenant independentemente do estado de auth.
 */
export async function signUpBusinessOwner(
  data: SignUpData,
): Promise<Result<{ userId: string }>> {
  const limit = rateLimit(`signup:${data.email}`, 3, 60_000);
  if (!limit.allowed) {
    return err("Muitas tentativas. Tente novamente em alguns minutos.", "rate-limit/exceeded");
  }

  const admin = createAdminClient();

  // 1. Cria auth.user
  const { data: authData, error: signUpError } =
    await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

  if (signUpError || !authData.user) {
    return err(
      signUpError?.message ?? "Falha ao criar usuário",
      "auth/signup-failed",
    );
  }

  const userId = authData.user.id;

  // 2. Cria tenant
  const tenantPayload = {
    name: data.tenantName,
    slug: data.tenantSlug,
    email: data.email,
    phone: data.phone,
  };

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert(tenantPayload)
    .select("id")
    .single();

  if (tenantError || !tenant) {
    // Rollback: deleta o auth.user criado
    await admin.auth.admin.deleteUser(userId);
    return err(
      tenantError?.message ?? "Falha ao criar empresa",
      "tenant/create-failed",
    );
  }

  // 3. Cria profile
  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    tenant_id: tenant.id,
    role: "business_owner",
    full_name: data.fullName,
    phone: data.phone,
  });

  if (profileError) {
    // Rollback
    await admin.auth.admin.deleteUser(userId);
    await admin.from("tenants").delete().eq("id", tenant.id);
    return err(
      profileError.message ?? "Falha ao criar perfil",
      "profile/create-failed",
    );
  }

  // 4. Cria tenant_settings com faixa padrão
  const { error: settingsError } = await admin.from("tenant_settings").insert({
    tenant_id: tenant.id,
    fee_ranges: [
      { minKm: 0, maxKm: 3, fee: 5 },
      { minKm: 3, maxKm: 5, fee: 7 },
      { minKm: 5, maxKm: 8, fee: 10 },
      { minKm: 8, maxKm: 999, fee: 15 },
    ],
  });

  if (settingsError) {
    // Rollback completo
    await admin.auth.admin.deleteUser(userId);
    await admin.from("tenants").delete().eq("id", tenant.id);
    await admin.from("profiles").delete().eq("id", userId);
    return err(
      settingsError.message ?? "Falha ao criar configurações",
      "settings/create-failed",
    );
  }

  revalidatePath("/", "layout");
  return ok({ userId });
}

/**
 * Login com email e senha.
 */
export async function signIn(data: SignInData): Promise<Result<void>> {
  const limit = rateLimit(`login:${data.email}`, 5, 60_000);
  if (!limit.allowed) {
    return err("Muitas tentativas. Tente novamente em alguns minutos.", "rate-limit/exceeded");
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return err(error.message, error.code);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Logout.
 */
export async function signOut(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Retorna usuário atual com dados do profile.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, tenant_id, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    role: profile.role,
    tenantId: profile.tenant_id,
    fullName: profile.full_name,
  };
}
