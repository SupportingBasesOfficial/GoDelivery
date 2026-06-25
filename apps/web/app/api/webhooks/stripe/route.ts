import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@repo/supabase";

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-09-30.acacia",
  });
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.order_id;

      if (orderId) {
        await admin
          .from("payments")
          .update({ status: "paid" })
          .eq("stripe_payment_intent_id", paymentIntent.id);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await admin
        .from("payments")
        .update({ status: "failed" })
        .eq("stripe_payment_intent_id", paymentIntent.id);
      break;
    }

    case "setup_intent.succeeded": {
      const setupIntent = event.data.object as Stripe.SetupIntent;
      const tenantId = setupIntent.metadata?.tenant_id;

      if (tenantId && setupIntent.payment_method) {
        // O cartão foi salvo com sucesso
        console.warn(`Cartão salvo para tenant ${tenantId}`);
      }
      break;
    }

    default:
      console.warn(`Evento não tratado: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
