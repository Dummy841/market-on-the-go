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
    const { order_id } = await req.json();

    if (!order_id) {
      throw new Error('order_id is required');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, total_amount, seller_name, status, seller_status')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message || 'Order not found');
    }

    // Idempotent: if already refunded, return success
    if (order.status === 'refunded') {
      return new Response(
        JSON.stringify({ success: true, refund_id: order.refund_id || null, already_refunded: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const refundAmount = Number(order.total_amount) || 0;
    if (refundAmount <= 0) {
      throw new Error('Invalid refund amount');
    }

    // Upsert wallet balance
    const { data: walletRow, error: walletFetchError } = await supabase
      .from('user_wallets')
      .select('id, balance')
      .eq('user_id', order.user_id)
      .maybeSingle();

    if (walletFetchError) {
      throw new Error(walletFetchError.message);
    }

    const currentBalance = Number((walletRow as any)?.balance || 0);

    if (!walletRow) {
      const { error: createWalletError } = await supabase
        .from('user_wallets')
        .insert({ user_id: order.user_id, balance: refundAmount });

      if (createWalletError) {
        throw new Error(createWalletError.message);
      }
    } else {
      const { error: updateWalletError } = await supabase
        .from('user_wallets')
        .update({ balance: currentBalance + refundAmount, updated_at: new Date().toISOString() })
        .eq('user_id', order.user_id);

      if (updateWalletError) {
        throw new Error(updateWalletError.message);
      }
    }

    const refund_id = `WALLET_${Date.now()}`;

    // Create credit transaction
    const { error: txnError } = await supabase
      .from('user_wallet_transactions')
      .insert({
        user_id: order.user_id,
        type: 'credit',
        amount: refundAmount,
        description: `Refund for Order #${order_id.slice(-6)}`,
        order_id: order_id,
      });

    if (txnError) {
      throw new Error(txnError.message);
    }

    // Mark order refunded
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({ status: 'refunded', refund_id, updated_at: new Date().toISOString() })
      .eq('id', order_id);

    if (orderUpdateError) {
      throw new Error(orderUpdateError.message);
    }

    return new Response(
      JSON.stringify({ success: true, refund_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('refund-rejected-order error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
