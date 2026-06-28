import { serve } from "https://deno.land"
import { createClient } from "https://esm.sh"

// Configuração dos cabeçalhos de segurança para responder aplicativos Web e Mobile (CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Garante que requisições de teste (OPTIONS) passem sem travar o app
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Inicializa o cliente do Supabase com superpoderes de sistema (Service Role)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Captura os dados enviados pelo aplicativo (ID do pedido que precisa de um motoboy)
    const { order_id } = await req.json()

    if (!order_id) {
      throw new Error("Missing 'order_id' in request body.")
    }

    // 3. Busca o pedido e a localização geográfica da loja (Merchant) que o criou
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        id,
        status,
        merchant_id,
        merchants ( location )
      `)
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      throw new Error(Order not found: ${orderError?.message})
    }

    // Garante que só vamos procurar motoboy se o pedido realmente precisar de um
    if (order.status !== 'SEARCHING_COURIER' && order.status !== 'CREATED') {
      return new Response(
        JSON.stringify({ message: "Order is not looking for a courier.", status: order.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // Extrai as coordenadas geográficas da loja (ponto de coleta do produto)
    const merchantLocation = (order.merchants as any).location

    // 4. ALGORITMO MEGA-TECH (PostGIS RPC): Busca os couriers ONLINE num raio de 5km (5000 metros)
    // Usamos uma chamada de função nativa do Postgres pela máxima velocidade de processamento
    const { data: closestCouriers, error: geoError } = await supabaseClient.rpc(
      'get_closest_couriers',
      {
        merchant_loc: merchantLocation,
        max_distance_meters: 5000, // Raio máximo de busca de 5 quilômetros
        max_results: 5 // Traz apenas os 5 motoboys mais perto para processar um por um
      }
    )

    if (geoError) {
      throw new Error(Geospatial matching failed: ${geoError.message})
    }

    // Se não encontrar nenhum motoboy na rua naquele momento
    if (!closestCouriers || closestCouriers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No available couriers nearby. Retrying shortly." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

    // 5. Atribui o pedido temporariamente ao primeiro motoboy da lista (o mais próximo)
    const targetCourier = closestCouriers[0]

    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({ 
        courier_id: targetCourier.id, 
        status: 'SEARCHING_COURIER', // Mantém buscando até que ele clique em aceitar no celular
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)

    if (updateError) throw updateError

    // 6. Registra o log imutável de auditoria na nuvem para controle do lojista
    await supabaseClient.from('audit_logs').insert({
      order_id: order_id,
      event_type: 'ORDER.COURIER_ASSIGNED_MATCH',
      metadata: { 
        courier_id: targetCourier.id, 
        distance_meters: Math.round(targetCourier.distance) 
      }
    })

    // Retorna o sucesso para o painel web do lojista
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