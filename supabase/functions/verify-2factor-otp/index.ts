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
    const { sessionId, otp } = await req.json();

    // sessionId is now the mobile number
    if (!sessionId || !otp) {
      return new Response(
        JSON.stringify({ success: false, error: 'Mobile number and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (otp.length !== 4) {
      return new Response(
        JSON.stringify({ success: false, error: 'OTP must be 4 digits' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the latest unused OTP for this mobile number
    const { data: otpRecord, error: fetchError } = await supabase
      .from('user_otp')
      .select('*')
      .eq('mobile', sessionId)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      console.error('OTP not found:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'OTP expired or not found. Please request a new OTP.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if OTP is expired
    const expiresAt = new Date(otpRecord.expires_at);
    if (new Date() > expiresAt) {
      return new Response(
        JSON.stringify({ success: false, error: 'OTP has expired. Please request a new OTP.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify OTP matches
    if (otpRecord.otp_code !== otp) {
      console.log('OTP mismatch - Expected:', otpRecord.otp_code, 'Received:', otp);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid OTP. Please check and try again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark OTP as used
    await supabase
      .from('user_otp')
      .update({ is_used: true })
      .eq('id', otpRecord.id);

    return new Response(
      JSON.stringify({ success: true, message: 'OTP verified successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in verify-2factor-otp function:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
