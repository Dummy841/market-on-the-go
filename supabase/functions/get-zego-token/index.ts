import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, roomId, userName } = await req.json();

    if (!userId || !roomId) {
      return new Response(
        JSON.stringify({ error: 'userId and roomId are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const ZEGO_APP_ID = Deno.env.get('ZEGO_APP_ID');
    const ZEGO_SERVER_SECRET = Deno.env.get('ZEGO_SERVER_SECRET');

    if (!ZEGO_APP_ID || !ZEGO_SERVER_SECRET) {
      console.error('ZEGOCloud credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Voice call service not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const appIdNum = parseInt(ZEGO_APP_ID, 10);
    
    // Return the credentials needed for client-side kit token generation
    // The client will use ZegoUIKitPrebuilt.generateKitTokenForTest()
    // This is the recommended approach for ZegoUIKitPrebuilt
    console.log('Returning ZEGO credentials for room:', roomId, 'user:', userId);

    return new Response(
      JSON.stringify({ 
        appId: appIdNum,
        serverSecret: ZEGO_SERVER_SECRET,
        roomId,
        userId,
        userName: userName || userId,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-zego-token:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get credentials' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
