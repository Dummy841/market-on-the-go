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

    if (!sessionId || !otp) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session ID and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test account bypass
    if (sessionId === 'TEST_SESSION' && otp === '0000') {
      return new Response(
        JSON.stringify({ success: true, message: 'OTP verified successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // sessionId is the mobile number for custom OTP flow
    const mobile = sessionId;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from('user_otp')
      .select('*')
      .eq('mobile', mobile)
      .eq('otp_code', otp)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching OTP:', fetchError);
      throw new Error('Failed to verify OTP');
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired OTP. Please try again.' }),
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
