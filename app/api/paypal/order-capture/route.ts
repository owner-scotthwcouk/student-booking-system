// app/api/paypal/order-capture/route.ts
import { NextResponse } from 'next/server';
import { captureOrder } from '../_paypal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { orderID } = await req.json();
    if (!orderID) return NextResponse.json({ error: 'Missing orderID' }, { status: 400 });
    const result = await captureOrder(String(orderID));
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Capture route error:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
