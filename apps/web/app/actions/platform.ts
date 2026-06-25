"use server";

import { createServerClient, createAdminClient, ok, err } from "@repo/supabase";
import type { Result } from "@repo/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface PlatformSettings {
  minTaxFee: number;
  platformPercentage: number;
  supportEmail: string | null;
}

const platformSettingsSchema = z.object({
  minTaxFee: z.number().min(0, "Taxa mínima não pode ser negativa"),
  platformPercentage: z.number().min(0).max(100, "Porcentagem deve estar entre 0 e 100"),
  supportEmail: z.string().email("Email de suporte inválido").nullable(),
});

export async function getPlatformSettings(): Promise<Result<PlatformSettings>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("platform_settings")
    .select("min_tax_fee, platform_percentage, support_email")
    .eq("is_active", true)
    .single();

  if (error) {
    return err(error.message, "platform/fetch-failed");
  }

  return ok({
    minTaxFee: data.min_tax_fee ?? 5,
    platformPercentage: data.platform_percentage ?? 20,
    supportEmail: data.support_email ?? null,
  });
}

export async function updatePlatformSettings(
  data: PlatformSettings,
): Promise<Result<void>> {
  const validation = platformSettingsSchema.safeParse(data);
  if (!validation.success) {
    return err(validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return err("Não autenticado", "auth/unauthenticated");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return err("Acesso negado", "auth/forbidden");
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("platform_settings")
    .update({
      min_tax_fee: data.minTaxFee,
      platform_percentage: data.platformPercentage,
      support_email: data.supportEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("is_active", true);

  if (error) {
    return err(error.message, "platform/update-failed");
  }

  revalidatePath("/dashboard/admin");
  return ok(undefined);
}
