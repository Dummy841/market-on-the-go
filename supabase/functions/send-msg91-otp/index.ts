import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { mobile, action } = await req.json();

    if (!mobile || mobile.length !== 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid mobile number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TEST MODE: Use a fixed OTP until real SMS OTP is enabled
    const otpCode = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Optional (real SMS) credentials
    const authKey = Deno.env.get('MSG91_AUTH_KEY');
    const templateId = Deno.env.get('MSG91_TEMPLATE_ID');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store OTP in database
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

    // Send OTP via MSG91 (optional)
    if (authKey && templateId) {
      const msg91Response = await fetch(
        `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=91${mobile}&otp=${otpCode}`,
        {
          method: 'POST',
          headers: {
            authkey: authKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const msg91Result = await msg91Response.json();
      console.log('MSG91 Response:', msg91Result);

      if (msg91Result.type === 'success' || msg91Result.type === 'SUCCESS') {
        return new Response(
          JSON.stringify({ success: true, message: 'OTP sent successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.error('MSG91 Error:', msg91Result);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'OTP generated (test mode: use 123456)',
          debug: msg91Result.message || 'SMS delivery may be delayed',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If MSG91 creds are not configured, still allow login/register with test OTP
    return new Response(
      JSON.stringify({ success: true, message: 'OTP generated (test mode: use 123456)' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in send-msg91-otp function:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
