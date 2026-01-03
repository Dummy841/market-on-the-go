import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, amount } = await req.json();

    console.log('Processing refund for order:', order_id, 'Amount:', amount);

    if (!order_id || !amount) {
      throw new Error('Order ID and amount are required');
    }

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials not configured');
      throw new Error('Razorpay credentials not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase credentials not configured');
      throw new Error('Supabase credentials not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get payment details from order - we need to find the payment ID
    // For now, we'll create a refund using payment capture approach
    // First, let's search for payments associated with this order
    
    const authHeader = 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    // Fetch payments from Razorpay to find the one for this order
    const paymentsResponse = await fetch(
      `https://api.razorpay.com/v1/payments?count=100`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
      }
    );

    if (!paymentsResponse.ok) {
      const errorText = await paymentsResponse.text();
      console.error('Razorpay payments fetch error:', errorText);
      throw new Error(`Failed to fetch payments: ${errorText}`);
    }

    const paymentsData = await paymentsResponse.json();
    console.log('Fetched payments count:', paymentsData.items?.length);

    // Find the payment for this order (look in notes or by amount match)
    const orderPayment = paymentsData.items?.find((payment: any) => {
      // Check if payment notes contain the order_id or matches by amount
      const paymentAmount = payment.amount / 100; // Convert from paise
      return (
        payment.status === 'captured' && 
        (payment.notes?.order_id === order_id || paymentAmount === amount)
      );
    });

    if (!orderPayment) {
      console.log('No matching payment found, creating refund record anyway');
      // Update order status to refunded in database
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', order_id);

      if (updateError) {
        console.error('Error updating order status:', updateError);
        throw new Error('Failed to update order status');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Order marked as refunded (no payment found to process)',
          refund_id: null
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log('Found payment to refund:', orderPayment.id, 'Amount:', orderPayment.amount);

    // Process refund via Razorpay
    const refundResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${orderPayment.id}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to paise
          notes: {
            order_id: order_id,
            reason: 'Order rejected by seller'
          }
        }),
      }
    );

    if (!refundResponse.ok) {
      const errorText = await refundResponse.text();
      console.error('Razorpay refund error:', errorText);
      throw new Error(`Refund failed: ${errorText}`);
    }

    const refundData = await refundResponse.json();
    console.log('Refund processed successfully:', refundData.id);

    // Update order status to refunded in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id);

    if (updateError) {
      console.error('Error updating order status:', updateError);
      // Don't throw - refund was successful, just log the DB error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        refund_id: refundData.id,
        amount: refundData.amount / 100,
        status: refundData.status,
        message: 'Refund processed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error processing refund:', error);
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
