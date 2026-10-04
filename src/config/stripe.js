import Stripe from "stripe";
import ENV from "./env.js";

if(!ENV.STRIPE_API_KEY || !ENV.STRIPE_PUBLISHABLE_KEY) {
    console.log('Stripe API Key or Publishable Key is not set. ')
}

const stripe = new Stripe(ENV.STRIPE_API_KEY)

export default stripe;