/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — Tipos do Supabase em modo manual
/* eslint-enable @typescript-eslint/ban-ts-comment */
"use server";

import Stripe from "stripe";
import { createServerClient, createAdminClient, ok, err } from "@repo/supabase";
import type { Result } from "@repo/supabase";
import { env } from "../../env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-09-30.acacia",
});

/**
 * Cria um SetupIntent para o empresário salvar o cartão.
 */
export async function createSetupIntent(): Promise<Result<{ clientSecret: string }>> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return err("Não autenticado", "auth/unauthenticated");
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, stripe_customer_id, name, email")
    .eq("email", user.email)
    .single();

  if (!tenant) {
    return err("Empresa não encontrada", "tenant/not-found");
  }

  let customerId = tenant.stripe_customer_id;

  // Cria customer no Stripe se não existir
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: tenant.name,
      email: tenant.email,
      metadata: { tenant_id: tenant.id },
    });
    customerId = customer.id;

    // Atualiza tenant com stripe_customer_id
    const admin = createAdminClient();
    await admin.from("tenants").update({ stripe_customer_id: customerId }).eq("id", tenant.id);
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    metadata: { tenant_id: tenant.id },
  });

  return ok({ clientSecret: setupIntent.client_secret! });
}

/**
 * Cria um PaymentIntent para cobrar uma entrega.
 * Chamado pelo webhook quando pedido é marcado como delivered.
 */
export async function chargeOrder(orderId: string): Promise<Result<{ paymentIntentId: string }>> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, tenant_id, delivery_fee, platform_fee, status")
    .eq("id", orderId)
    .single();

  if (!order || order.status !== "delivered") {
    return err("Pedido não encontrado ou não entregue", "order/invalid");
  }

  const { data: tenant } = await admin
    .from("tenants")
    .select("stripe_customer_id")
    .eq("id", order.tenant_id)
    .single();

  if (!tenant?.stripe_customer_id) {
    return err("Customer Stripe não encontrado", "stripe/customer-missing");
  }

  // Busca payment methods do customer
  const paymentMethods = await stripe.paymentMethods.list({
    customer: tenant.stripe_customer_id,
    type: "card",
  });

  if (paymentMethods.data.length === 0) {
    return err("Nenhum cartão cadastrado", "stripe/no-payment-method");
  }

  const amount = Math.round(order.delivery_fee * 100); // centavos

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "brl",
    customer: tenant.stripe_customer_id,
    payment_method: paymentMethods.data[0].id,
    off_session: true,
    confirm: true,
    metadata: {
      order_id: orderId,
      tenant_id: order.tenant_id,
    },
    description: `GoDelivery — Entrega ${orderId}`,
  });

  // Registra o pagamento no banco
  await admin.from("payments").insert({
    tenant_id: order.tenant_id,
    order_id: orderId,
    stripe_payment_intent_id: paymentIntent.id,
    amount: order.delivery_fee,
    status: paymentIntent.status === "succeeded" ? "paid" : "pending",
  });

  return ok({ paymentIntentId: paymentIntent.id });
}
