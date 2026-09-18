// Test double for the `stripe` package, used by tools/check-admin-grants.mjs and
// tools/check-subject-pricing.mjs via tools/grants-loader.mjs so the real
// api/stripe/webhook.js and api/checkout/create-session.js handlers can be driven
// offline: the harness sets `event` to the checkout event the signature check
// should return, or `constructError` to make verification fail. Everything
// checkout.sessions.create was called with lands in `checkoutSessions`, which is
// what lets a harness feed the metadata the real checkout produced straight into
// the real webhook (instead of hand-writing metadata the code might never emit).

export const state = {
  event: null,
  constructError: null,
  constructed: [],
  checkoutSessions: [],
};

export function reset() {
  state.event = null;
  state.constructError = null;
  state.constructed = [];
  state.checkoutSessions = [];
}

export default class Stripe {
  constructor(secretKey, options) {
    this.secretKey = secretKey;
    this.options = options;
  }

  get webhooks() {
    return {
      constructEvent: (rawBody, signature, secret) => {
        state.constructed.push({
          signature,
          secret,
          bytes: rawBody && typeof rawBody.length === "number" ? rawBody.length : 0,
        });
        if (state.constructError) throw state.constructError;
        return state.event;
      },
    };
  }

  get checkout() {
    return {
      sessions: {
        create: async (params) => {
          state.checkoutSessions.push(params);
          if (state.createError) throw state.createError;
          const n = state.checkoutSessions.length;
          return { id: `cs_offline_${n}`, url: `https://checkout.stripe.example/pay/cs_offline_${n}` };
        },
      },
    };
  }
}
