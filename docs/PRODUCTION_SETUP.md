Production setup
================


Required environment variables
- `VITE_SUPABASE_URL` - public Supabase URL for the frontend
- `VITE_SUPABASE_ANON_KEY` - public anon key for Supabase (frontend)
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key for the frontend

Server-side required env vars
- `STRIPE_SECRET_KEY` - Stripe secret key (server)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (for webhooks)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only, used by server routes to write records)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL for Next server (if using Next app routes)

Notes
- This project is configured to use Stripe for payments. The frontend uses `src/components/payment/StripePayment.jsx` and reads `VITE_STRIPE_PUBLIC_KEY`.
- Server endpoints for creating PaymentIntents and recording payments are in `api/stripe/create-intent.js` and `api/stripe/record-payment.js`. They require `STRIPE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
- Prefer validating payments server-side (webhook) for production; the `record-payment` endpoint verifies the PaymentIntent with Stripe before recording.
- Remove PayPal-related routes if not used.

Notes
- PayPal order capture and logging are performed in server routes under `app/api/paypal` which require service-role access to update `bookings` and insert into `payments`.
- Frontend uses `src/components/PayNow.jsx` and `src/lib/loadPayPalSdk.js` (reads `VITE_PAYPAL_CLIENT_ID`).
- For Stripe support, ensure you have server endpoints to create and confirm payment intents and a secure service role key to record payments.

Deploy checklist
- Provide the server env vars in your hosting provider (Vercel, Azure, etc.).
- Ensure RLS policies on Supabase allow the server (service role) to write `payments` and update `bookings`.
- Configure webhooks (PayPal) and protect the webhook route with signatures.
- Run end-to-end tests for booking → payment → booking status update.
