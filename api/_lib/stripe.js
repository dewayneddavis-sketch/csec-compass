// Stripe server-side init for Vercel API functions
// Uses STRIPE_SECRET_KEY env var

let stripeClient = null;

export function getStripe() {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn("Stripe secret key not configured. Set STRIPE_SECRET_KEY env var.");
    return null;
  }
  // Dynamic import so Stripe is only loaded server-side
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Stripe = require("stripe");
  stripeClient = new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
  return stripeClient;
}

export default getStripe;