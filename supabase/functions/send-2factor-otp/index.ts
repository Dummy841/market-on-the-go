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
    const { mobile, action } = await req.json();

    if (!mobile || mobile.length !== 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid mobile number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('TWOFACTOR_API_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: '2Factor API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 4-digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log('Generated 4-digit OTP:', otpCode);

    // Store OTP in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    const { error: dbError } = await supabase
      .from('user_otp')
      .insert({
        mobile: mobile,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString()
      });

    if (dbError) {
      console.error('Error storing OTP:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send OTP via 2Factor SMS API (simple text SMS)
    const smsText = `Your OTP is ${otpCode}. Valid for 5 minutes. Do not share with anyone.`;
    const response = await fetch(
      `https://2factor.in/API/V1/${apiKey}/ADDON_SERVICES/SEND/TSMS`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: 'TXTIND',
          To: mobile,
          Msg: smsText
        }).toString()
      }
    );

    const result = await response.json();
    console.log('2Factor SMS Response:', result);

    if (result.Status === 'Success') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP sent via SMS successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('2Factor Error:', result);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: result.Details || 'Failed to send OTP' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in send-2factor-otp function:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
