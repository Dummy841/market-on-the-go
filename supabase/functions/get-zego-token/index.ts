import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert string to Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Helper function to convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate HMAC-SHA256 using Web Crypto API
async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    stringToUint8Array(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    stringToUint8Array(message)
  );
  
  return arrayBufferToHex(signature);
}

// Generate kit token for ZegoUIKitPrebuilt
async function generateKitToken(
  appId: number,
  serverSecret: string,
  roomId: string,
  userId: string,
  userName: string = ''
): Promise<string> {
  const effectiveTime = 3600; // 1 hour
  const payloadObject = {
    app_id: appId,
    room_id: roomId,
    user_id: userId,
    user_name: userName,
    privilege: {
      1: 1, // can login room
      2: 1, // can publish stream
    },
    stream_id_list: null,
  };

  const payload = JSON.stringify(payloadObject);
  const nonce = Math.floor(Math.random() * 2147483647);
  const currentTime = Math.floor(Date.now() / 1000);

  // Create the content to sign
  const hashContent = `${appId}${serverSecret}${roomId}${userId}${effectiveTime}${nonce}${currentTime}`;
  
  // Generate HMAC signature
  const hash = await hmacSha256(serverSecret, hashContent);

  // Build the token
  const tokenInfo = {
    ver: 1,
    hash: hash,
    nonce: nonce,
    expired: currentTime + effectiveTime,
  };

  const base64Token = btoa(JSON.stringify({
    ...tokenInfo,
    payload: btoa(payload),
  }));

  return `04${base64Token}`;
}

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
    
    // Generate kit token for ZegoUIKitPrebuilt
    const token = await generateKitToken(
      appIdNum,
      ZEGO_SERVER_SECRET,
      roomId,
      userId,
      userName || userId
    );

    console.log('Generated ZEGO token for room:', roomId, 'user:', userId);

    return new Response(
      JSON.stringify({ 
        token, 
        appId: appIdNum,
        roomId,
        userId,
        userName: userName || userId,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error generating ZEGO token:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate token' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
