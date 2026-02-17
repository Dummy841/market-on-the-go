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

    // Test account bypass - skip real SMS for test number
    const TEST_MOBILE = '9502395261';
    const TEST_OTP = '0000';
    
    if (mobile === TEST_MOBILE) {
      console.log('Test account detected, using default OTP');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Test OTP ready (use 0000)',
          sessionId: 'TEST_SESSION',
          isTestAccount: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('TWOFACTOR_API_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: '2Factor API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send OTP via 2Factor SMS API using AUTOGEN with template name "zippy" and 4-digit OTP
    const smsUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${mobile}/AUTOGEN/zippy`;
    console.log('Sending SMS OTP via AUTOGEN URL:', smsUrl.replace(apiKey, '***'));
    const response = await fetch(smsUrl, { method: 'GET' });

    const result = await response.json();
    console.log('2Factor SMS Response:', result);

    if (result.Status === 'Success') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP sent via SMS successfully',
          sessionId: result.Details // 2Factor session ID for verification
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
