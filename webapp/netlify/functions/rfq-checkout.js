import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { rfqId, amount, projectName, userEmail, userId } = JSON.parse(event.body);

    if (!rfqId || !amount) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing rfqId or amount' }) };
    }

    const origin = event.headers.origin || 'https://www.atlasdt.com';

    // Create a one-time payment Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userEmail || undefined,
      client_reference_id: userId || rfqId,
      metadata: {
        rfq_id: rfqId,
        user_id: userId || '',
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(amount * 100), // Stripe uses cents
            product_data: {
              name: `AtlasDT Manufacturing Order`,
              description: projectName || `RFQ #${rfqId.slice(0, 8)}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/workspace.html?tab=rfqs&payment=success&rfq=${rfqId}`,
      cancel_url:  `${origin}/workspace.html?tab=rfqs&payment=cancelled&rfq=${rfqId}`,
    });

    console.log(`[RFQ Checkout] Session ${session.id} created for RFQ ${rfqId} — $${amount}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error('[RFQ Checkout] Error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to create checkout session', details: err.message }),
    };
  }
};
