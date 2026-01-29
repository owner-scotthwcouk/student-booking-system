import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY

if (!stripePublicKey) {
  console.error('Missing VITE_STRIPE_PUBLIC_KEY environment variable')
}

export const stripePromise = loadStripe(stripePublicKey)
