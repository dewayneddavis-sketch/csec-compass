// Stripe server-side init for Vercel API functions
// Uses a static ESM import so Vercel's bundler includes the stripe
// package in the serverless function bundle. (A previous createRequire
// version crashed every importing function with
// FUNCTION_INVOCATION_FAILED on Node 24.)
import Stripe from "stripe";

let stripeClient = null;

export function getStripe() {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn("Stripe secret key not configured. Set STRIPE_SECRET_KEY env var.");
    return null;
  }
  stripeClient = new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
  return stripeClient;
}

export default getStripe;
