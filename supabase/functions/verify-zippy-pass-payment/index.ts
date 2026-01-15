import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, user_id } = await req.json();

    console.log('Verifying Zippy Pass payment:', { razorpay_order_id, razorpay_payment_id, user_id });

    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpayKeySecret) {
      console.error('RAZORPAY_KEY_SECRET not configured');
      throw new Error('Payment verification not configured');
    }

    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(razorpayKeySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const data = `${razorpay_order_id}|${razorpay_payment_id}`;
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Payment verification failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Signature verified successfully');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    // Insert subscription
    const { data: subscription, error: insertError } = await supabase
      .from('zippy_pass_subscriptions')
      .insert({
        user_id: user_id,
        razorpay_payment_id: razorpay_payment_id,
        amount: 199,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting subscription:', insertError);
      throw new Error('Failed to create subscription');
    }

    console.log('Subscription created:', subscription);

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscription,
        message: 'Zippy Pass activated successfully!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing Zippy Pass payment:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
