// app/api/paypal/order-create/route.ts
import { NextResponse } from 'next/server';
import { createOrder } from '../_paypal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { value, currency_code = 'GBP' } = await req.json();
    if (!value) return NextResponse.json({ error: 'Missing value' }, { status: 400 });
    const order = await createOrder(String(value), String(currency_code));
    return NextResponse.json(order);
  } catch (err: any) {
    console.error('Create route error:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
