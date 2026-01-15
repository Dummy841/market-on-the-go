import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      user_id,
      amount 
    } = await req.json();

    console.log('Verifying wallet top-up payment:', { razorpay_order_id, razorpay_payment_id, user_id, amount });

    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay secret not configured');
    }

    // Verify signature using Web Crypto API
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(RAZORPAY_KEY_SECRET);
    const data = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const generatedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (generatedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      throw new Error('Payment verification failed');
    }

    console.log('Payment signature verified successfully');

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if wallet exists
    const { data: walletData, error: walletError } = await supabase
      .from('user_wallets')
      .select('balance')
      .eq('user_id', user_id)
      .single();

    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching wallet:', walletError);
      throw new Error('Failed to fetch wallet');
    }

    const currentBalance = walletData?.balance || 0;

    if (!walletData) {
      // Create wallet
      const { error: createError } = await supabase
        .from('user_wallets')
        .insert({
          user_id: user_id,
          balance: amount,
        });
      if (createError) {
        console.error('Error creating wallet:', createError);
        throw new Error('Failed to create wallet');
      }
    } else {
      // Update wallet balance
      const { error: updateError } = await supabase
        .from('user_wallets')
        .update({ 
          balance: currentBalance + amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id);
      if (updateError) {
        console.error('Error updating wallet:', updateError);
        throw new Error('Failed to update wallet');
      }
    }

    // Create credit transaction
    const { error: txnError } = await supabase
      .from('user_wallet_transactions')
      .insert({
        user_id: user_id,
        type: 'credit',
        amount: amount,
        description: `Added via Razorpay (${razorpay_payment_id.slice(-8)})`,
      });
    if (txnError) {
      console.error('Error creating transaction:', txnError);
    }

    console.log('Wallet top-up successful:', { user_id, amount, new_balance: currentBalance + amount });

    return new Response(
      JSON.stringify({ 
        success: true, 
        new_balance: currentBalance + amount,
        message: 'Money added to wallet successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error verifying wallet top-up:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
