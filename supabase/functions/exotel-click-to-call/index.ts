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
    const { from, to, orderId, callerType } = await req.json();

    // Validate both numbers
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!from || !mobileRegex.test(from)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid caller mobile number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!to || !mobileRegex.test(to)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid callee mobile number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const exotelSid = Deno.env.get('EXOTEL_SID');
    const exotelApiKey = Deno.env.get('EXOTEL_API_KEY');
    const exotelApiToken = Deno.env.get('EXOTEL_API_TOKEN');
    const exotelCallerId = Deno.env.get('EXOTEL_CALLER_ID');

    if (!exotelSid || !exotelApiKey || !exotelApiToken || !exotelCallerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Exotel credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Exotel Connect API
    const authHeader = btoa(`${exotelApiKey}:${exotelApiToken}`);
    const exotelUrl = `https://api.exotel.com/v1/Accounts/${exotelSid}/Calls/connect`;

    const formBody = new URLSearchParams({
      From: `0${from}`,
      To: `0${to}`,
      CallerId: exotelCallerId,
      CallType: 'trans',
    });

    console.log(`Initiating Exotel call: ${from} -> ${to}, order: ${orderId || 'N/A'}`);

    const response = await fetch(exotelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    const resultText = await response.text();
    console.log('Exotel response:', response.status, resultText);

    // Store call record
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to parse Exotel response for call SID
    let callSid = '';
    try {
      // Exotel returns XML, extract Sid
      const sidMatch = resultText.match(/<Sid>(.*?)<\/Sid>/);
      if (sidMatch) callSid = sidMatch[1];
    } catch (e) {
      console.log('Could not parse call SID from response');
    }

    await supabase.from('exotel_calls').insert({
      order_id: orderId || null,
      caller_mobile: from,
      callee_mobile: to,
      caller_type: callerType || 'user',
      exotel_call_sid: callSid || null,
      status: response.ok ? 'initiated' : 'failed',
    });

    if (response.ok) {
      return new Response(
        JSON.stringify({ success: true, callSid, message: 'Call initiated. You will receive a call shortly.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Failed to initiate call via Exotel' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in exotel-click-to-call:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
