import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// O Supabase já injeta nativamente o Deno.serve no ambiente de execução global
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { order_id } = await req.json()

    if (!order_id) {
      throw new Error("Missing 'order_id' in request body.")
    }

    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, status, merchant_id, merchants ( location )')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      throw new Error("Order not found: " + (orderError?.message || "Unknown error"))
    }

    if (order.status !== 'SEARCHING_COURIER' && order.status !== 'CREATED') {
      return new Response(
        JSON.stringify({ message: "Order is not looking for a courier.", status: order.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const merchantLocation = (order.merchants as any).location

    const { data: closestCouriers, error: geoError } = await supabaseClient.rpc(
      'get_closest_couriers',
      {
        merchant_loc: merchantLocation,
        max_distance_meters: 5000,
        max_results: 5
      }
    )

    if (geoError) {
      throw new Error("Geospatial matching failed: " + geoError.message)
    }

    if (!closestCouriers || closestCouriers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No available couriers nearby. Retrying shortly." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

    const targetCourier = closestCouriers

    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({ 
        courier_id: targetCourier.id, 
        status: 'SEARCHING_COURIER',
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)

    if (updateError) throw updateError

    await supabaseClient.from('audit_logs').insert({
      order_id: order_id,
      event_type: 'ORDER.COURIER_ASSIGNED_MATCH',
      metadata: { 
        courier_id: targetCourier.id, 
        distance_meters: Math.round(targetCourier.distance) 
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Closest courier found and notified.", 
        courier: { id: targetCourier.id, distance_meters: targetCourier.distance } 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})