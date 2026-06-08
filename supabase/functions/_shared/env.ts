// supabase/functions/_shared/env.ts

export const MODE = Deno.env.get('PAYPAL_MODE') || 'sandbox';

export const PAYPAL_CLIENT_ID = MODE === 'live' 
  ? Deno.env.get('PAYPAL_CLIENT_ID_LIVE') 
  : Deno.env.get('PAYPAL_CLIENT_ID_SANDBOX');

export const PAYPAL_SECRET = MODE === 'live' 
  ? Deno.env.get('PAYPAL_SECRET_LIVE') 
  : Deno.env.get('PAYPAL_SECRET_SANDBOX');

export const PAYPAL_BASE_URL = MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';
