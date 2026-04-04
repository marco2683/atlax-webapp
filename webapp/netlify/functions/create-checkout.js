import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
    }

    const planId = process.env.STRIPE_PRO_PRICE_ID;
    
    if (!planId) {
      console.error('Missing STRIPE_PRO_PRICE_ID in environment variables');
      return { statusCode: 500, body: JSON.stringify({ error: 'Stripe configuration error' }) };
    }

    // CREATE REAL STRIPE CHECKOUT
    // This requires STRIPE_SECRET_KEY in the Netlify environment variables
    const origin = event.headers.origin || 'https://atlax.netlify.app';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: planId, quantity: 1 }],
      mode: 'subscription',
      client_reference_id: userId,
      success_url: `${origin}/app.html?success=true`,
      cancel_url: `${origin}/app.html?canceled=true`,
    });
    
    console.log(`[Stripe Checkout] Created session ${session.id} for user ${userId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };
    
  } catch (err) {
    console.error('Checkout error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create stripe checkout session', details: err.message })
    };
  }
};
