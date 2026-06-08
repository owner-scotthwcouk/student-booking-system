import { PAYPAL_BASE_URL, PAYPAL_CLIENT_ID, PAYPAL_SECRET } from "../_shared/env.ts";

// When fetching your Auth Token:
const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
  method: "POST",
  headers: {
    "Authorization": `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`)}`,
  },
  body: "grant_type=client_credentials",
});
