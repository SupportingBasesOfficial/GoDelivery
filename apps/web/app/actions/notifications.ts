"use server";

import { createAdminClient, ok, err } from "@repo/supabase";
import type { Result } from "@repo/supabase";
import { validate, uuidSchema } from "./schemas";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(
  courierId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<Result<void>> {
  const validation = validate(uuidSchema, courierId);
  if (!validation.success) {
    return err("ID do motoboy inválido", "validation/invalid-input");
  }

  const admin = createAdminClient();

  const { data: courier, error } = await admin
    .from("couriers")
    .select("fcm_token")
    .eq("id", courierId)
    .single();

  if (error) {
    console.error("[Push] Erro ao buscar courier:", error.message);
    return err("Token nao encontrado", "push/token-not-found");
  }

  if (!courier?.fcm_token) {
    console.error("[Push] Sem fcm_token para courier:", courierId);
    return err("Token nao encontrado", "push/token-not-found");
  }

  console.warn("[Push] Enviando para token:", courier.fcm_token.substring(0, 20) + "...");

  const message: PushMessage = {
    to: courier.fcm_token,
    title,
    body,
    data,
  };

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Push] Expo push failed:", text);
    return err(`Expo push failed: ${text}`, "push/send-failed");
  }

  const result = await response.json();
  console.warn("[Push] Expo response:", JSON.stringify(result));

  return ok(undefined);
}
