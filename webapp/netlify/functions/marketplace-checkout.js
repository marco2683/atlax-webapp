import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, userEmail, items, shippingAddress, orderRef } = JSON.parse(event.body);

    if (!userId || !items || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId or items' }) };
    }

    const origin = event.headers.origin || 'https://www.atlasdt.com';

    // Build Stripe line_items from cart
    const line_items = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name || item.mpn || 'Marketplace Item',
          description: item.supplier_name ? `Supplier: ${item.supplier_name}` : undefined,
        },
        unit_amount: Math.round((item.price || 0) * 100), // Stripe uses cents
      },
      quantity: item.quantity || 1,
    }));

    // Add GST as a separate line item (10%)
    const subtotal = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const gst = Math.round(subtotal * 0.1 * 100);
    if (gst > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'GST (10%)' },
          unit_amount: gst,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      client_reference_id: userId,
      customer_email: userEmail || undefined,
      metadata: {
        orderRef: orderRef || '',
        userId: userId,
        shippingAddress: JSON.stringify(shippingAddress || {}).slice(0, 500),
      },
      success_url: `${origin}/app.html?mkt_checkout=success&ref=${orderRef || ''}`,
      cancel_url: `${origin}/app.html?mkt_checkout=canceled`,
    });

    console.log(`[Marketplace Stripe] Session ${session.id} for ${userEmail} — ${orderRef}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url, sessionId: session.id })
    };

  } catch (err) {
    console.error('Marketplace checkout error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create checkout session', details: err.message })
    };
  }
};
