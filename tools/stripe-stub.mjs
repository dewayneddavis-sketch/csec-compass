// Test double for the `stripe` package, used by tools/check-admin-grants.mjs via
// tools/grants-loader.mjs so the real api/stripe/webhook.js handler can be driven
// offline: the harness sets `event` to the checkout event the signature check
// should return, or `constructError` to make verification fail.

export const state = {
  event: null,
  constructError: null,
  constructed: [],
};

export function reset() {
  state.event = null;
  state.constructError = null;
  state.constructed = [];
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
}
