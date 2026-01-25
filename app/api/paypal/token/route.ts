// app/api/paypal/token/route.ts
import { NextResponse } from 'next/server';
import { getAccessToken } from '../_paypal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tok = await getAccessToken();
    return NextResponse.json(tok);
  } catch (err: any) {
    console.error('Token route error:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
