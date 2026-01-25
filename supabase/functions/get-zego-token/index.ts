import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const encoder = new TextEncoder();

function toB64(bytes: Uint8Array): string {
  // btoa expects latin1
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function makeNonce(): number {
  // int32 range
  return Math.floor(Math.random() * 0x7fffffff);
}

function makeRandomIvString(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function pkcs7Pad(data: Uint8Array, blockSize = 16): Uint8Array {
  const pad = blockSize - (data.length % blockSize || blockSize);
  const out = new Uint8Array(data.length + pad);
  out.set(data);
  out.fill(pad, data.length);
  return out;
}

async function aesCbcEncryptPkcs7(plainText: string, keyStr: string, ivStr: string): Promise<Uint8Array> {
  const keyBytes = encoder.encode(keyStr);
  const ivBytes = encoder.encode(ivStr);
  const plainBytes = pkcs7Pad(encoder.encode(plainText), 16);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: ivBytes },
    cryptoKey,
    plainBytes
  );

  return new Uint8Array(encrypted);
}

// Official ZEGO Token04 (AES-CBC + base64). This is what ZegoUIKitPrebuilt expects as kitToken.
async function generateToken04(appId: number, userId: string, secret: string, effectiveTimeInSeconds: number, payload = ''): Promise<string> {
  if (!appId || typeof appId !== 'number') throw new Error('appId invalid');
  if (!userId || typeof userId !== 'string') throw new Error('userId invalid');
  if (!secret || typeof secret !== 'string' || secret.length !== 32) throw new Error('secret must be a 32 byte string');
  if (!effectiveTimeInSeconds || typeof effectiveTimeInSeconds !== 'number') throw new Error('effectiveTimeInSeconds invalid');

  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: makeNonce(),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload: payload || '',
  };

  const plainText = JSON.stringify(tokenInfo);
  const iv = makeRandomIvString();
  const encrypted = await aesCbcEncryptPkcs7(plainText, secret, iv);

  // Binary layout: expire(int64 BE) + ivLen(uint16 BE) + ivBytes + cipherLen(uint16 BE) + cipherBytes
  const ivBytes = encoder.encode(iv);
  const totalLen = 8 + 2 + ivBytes.length + 2 + encrypted.length;
  const buf = new Uint8Array(totalLen);
  const dv = new DataView(buf.buffer);

  dv.setBigInt64(0, BigInt(tokenInfo.expire), false);
  dv.setUint16(8, ivBytes.length, false);
  buf.set(ivBytes, 10);
  dv.setUint16(10 + ivBytes.length, encrypted.length, false);
  buf.set(encrypted, 12 + ivBytes.length);

  return '04' + toB64(buf);
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
    
    // Generate official Token04 (kitToken) for ZegoUIKitPrebuilt
    const token = await generateToken04(
      appIdNum,
      userId,
      ZEGO_SERVER_SECRET,
      3600,
      ''
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
