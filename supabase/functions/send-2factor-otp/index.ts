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

    // Send OTP via 2Factor API
    const response = await fetch(
      `https://2factor.in/API/V1/${apiKey}/SMS/${mobile}/AUTOGEN`,
      { method: 'GET' }
    );

    const result = await response.json();
    console.log('2Factor Response:', result);

    if (result.Status === 'Success') {
      // Store session ID for verification
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Store session ID in user_otp table for verification
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      
      const { error: dbError } = await supabase
        .from('user_otp')
        .insert({
          mobile: mobile,
          otp_code: result.Details, // This is the session ID from 2Factor
          expires_at: expiresAt.toISOString()
        });

      if (dbError) {
        console.error('Error storing session ID:', dbError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP sent successfully',
          sessionId: result.Details 
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
