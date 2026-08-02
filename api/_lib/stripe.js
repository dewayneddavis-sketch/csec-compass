// Stripe server-side init for Vercel API functions
// Uses createRequire to work around Vercel ESM bundling issues
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Stripe = require("stripe").default || require("stripe");

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
