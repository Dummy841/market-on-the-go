import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      order_data,
      order_data_list,
    } = await req.json();

    console.log('Verifying Razorpay payment:', { razorpay_order_id, razorpay_payment_id });

    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay secret not configured');
    }

    // Verify signature
    const crypto = await import("https://deno.land/std@0.168.0/crypto/mod.ts");
    const encoder = new TextEncoder();
    const key = await crypto.crypto.subtle.importKey(
      "raw",
      encoder.encode(RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const data = `${razorpay_order_id}|${razorpay_payment_id}`;
    const signature = await crypto.crypto.subtle.sign("HMAC", key, encoder.encode(data));
    
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      throw new Error('Payment verification failed - invalid signature');
    }

    console.log('Payment signature verified successfully');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Support both single order_data and order_data_list (array)
    const ordersToCreate = order_data_list || (order_data ? [order_data] : []);

    if (ordersToCreate.length === 0) {
      throw new Error('No order data provided');
    }

    const insertedOrders = [];
    for (const od of ordersToCreate) {
      const { data: insertedOrder, error: insertError } = await supabase
        .from('orders')
        .insert([{
          ...od,
          payment_method: od.payment_method || 'razorpay',
          status: 'pending'
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting order:', insertError);
        throw new Error(`Failed to create order: ${insertError.message}`);
      }

      console.log('Order created:', insertedOrder.id);
      insertedOrders.push(insertedOrder);
    }

    // Fetch full details for first order (for tracking)
    const { data: orderDetails } = await supabase
      .from('orders')
      .select('*, delivery_partners(id, name, mobile, profile_photo_url), sellers(seller_latitude, seller_longitude, seller_name)')
      .eq('id', insertedOrders[0].id)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: orderDetails,
        orders: insertedOrders,
        payment_id: razorpay_payment_id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error verifying payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
