import express from 'express';
import { handleStripeWebhook } from './stripe.webhook.js';

/**
 * Mount all inbound webhook routes.
 *
 * Must be called BEFORE `express.json()` so providers that need a raw body
 * (Stripe signature verification) still receive the unparsed payload.
 */
export const mountWebhooks = (app) => {
  const rawJson = express.raw({ type: 'application/json' });

  // Preferred path — all webhooks live under /api/webhooks/*
  app.post('/api/webhooks/stripe', rawJson, handleStripeWebhook);

  // Backward-compatible alias used by earlier Stripe CLI / dashboard setups
  app.post('/api/stripe/webhook', rawJson, handleStripeWebhook);
};
export default mountWebhooks;