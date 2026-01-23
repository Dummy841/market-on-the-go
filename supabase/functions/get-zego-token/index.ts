import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.119.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate ZegoUIKitPrebuilt token
function generateToken(
  appId: number,
  serverSecret: string,
  roomId: string,
  userId: string,
  userName: string,
  effectiveTimeInSeconds: number = 3600
): string {
  // For ZegoUIKitPrebuilt, we use their token generation format
  // This is a simplified version - in production use their official token generator
  
  const nonce = Math.floor(Math.random() * 2147483647);
  const createTime = Math.floor(Date.now() / 1000);
  const expireTime = createTime + effectiveTimeInSeconds;

  // Payload for the token
  const payload = {
    app_id: appId,
    user_id: userId,
    nonce,
    ctime: createTime,
    expire: expireTime,
    payload: JSON.stringify({
      room_id: roomId,
      privilege: { 1: 1, 2: 1 },
      stream_id_list: null,
    }),
  };

  const payloadString = JSON.stringify(payload);
  
  // Create signature
  const hmac = createHmac("sha256", serverSecret);
  hmac.update(payloadString);
  const signature = hmac.digest("hex");

  // Encode the token
  const tokenInfo = {
    ...payload,
    signature,
  };

  // Base64 encode
  const tokenBase64 = btoa(JSON.stringify(tokenInfo));
  
  // Return token with version prefix (04 = version 4)
  return `04${tokenBase64}`;
}

// Alternative: Use ZegoUIKitPrebuilt.generateKitTokenForTest format
function generateKitToken(
  appId: number,
  serverSecret: string,
  roomId: string,
  userId: string,
  userName: string = ''
): string {
  // This generates a test token compatible with ZegoUIKitPrebuilt
  // For production, you should use their server-side token generation SDK
  
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
  
  const hmac = createHmac("sha256", serverSecret);
  hmac.update(hashContent);
  const hash = hmac.digest("hex");

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
    const token = generateKitToken(
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
