import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generate4DigitOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mobile, action } = await req.json();

    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid mobile number. Must be 10 digits starting with 6, 7, 8, or 9' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test account bypass
    const TEST_MOBILES = ['7894561230'];
    if (TEST_MOBILES.includes(mobile)) {
      console.log('Test account detected, using default OTP 0000');
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

    const apiKey = Deno.env.get('RENFLAIR_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Renflair API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for an existing valid (unused, not expired) OTP for this mobile
    const { data: existingOtp } = await supabase
      .from('user_otp')
      .select('*')
      .eq('mobile', mobile)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingOtp) {
      console.log('Reusing existing valid OTP for', mobile, '- expires at', existingOtp.expires_at);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP is still active. Please use the OTP sent earlier.',
          sessionId: mobile,
          reused: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No valid OTP exists — generate a new one
    const otp = generate4DigitOtp();
    console.log('Generated new 4-digit OTP for', mobile);

    // Mark old OTPs as used
    await supabase
      .from('user_otp')
      .update({ is_used: true })
      .eq('mobile', mobile)
      .eq('is_used', false);

    // Insert new OTP with 5 min expiry
    const { error: insertError } = await supabase
      .from('user_otp')
      .insert({
        mobile,
        otp_code: otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error('Error storing OTP:', insertError);
      throw new Error('Failed to store OTP');
    }

    // Send OTP via Renflair SMS API
    const smsUrl = `https://sms.renflair.in/V1.php?API=${apiKey}&PHONE=${mobile}&OTP=${otp}`;
    console.log('Sending OTP via Renflair SMS');
    const response = await fetch(smsUrl, { method: 'GET' });

    const resultText = await response.text();
    console.log('Renflair SMS Response:', resultText);

    if (response.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP sent via SMS successfully',
          sessionId: mobile
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('Renflair Error:', resultText);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to send OTP via SMS' 
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
