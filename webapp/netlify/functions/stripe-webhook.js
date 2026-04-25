import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook signature error: ${err.message}`);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const rfqId  = session.metadata?.rfq_id;
      const userId = session.client_reference_id;

      // ── RFQ one-time payment ──────────────────────────────────────
      if (rfqId) {
        console.log(`[Webhook] RFQ payment for ${rfqId}`);

        const paidAt     = new Date().toISOString();
        const amountPaid = (session.amount_total || 0) / 100; // cents → dollars

        // Fetch current rfq_data to merge
        const { data: rfqRow, error: fetchErr } = await supabase
          .from('rfq_history')
          .select('rfq_data')
          .eq('id', rfqId)
          .single();
        if (fetchErr) throw fetchErr;

        const updatedData = {
          ...(rfqRow?.rfq_data || {}),
          payment_status:   'paid',
          payment_method:   'stripe',
          paid_at:          paidAt,
          stripe_session_id: session.id,
          amount_paid:      amountPaid,
        };

        const { error: updateErr } = await supabase
          .from('rfq_history')
          .update({ status: 'paid', rfq_data: updatedData })
          .eq('id', rfqId);
        if (updateErr) throw updateErr;

        console.log(`[Webhook] RFQ ${rfqId} → PAID $${amountPaid}`);

        // Trigger confirmation email
        const customerEmail = session.customer_details?.email || session.customer_email;
        const projectName   = rfqRow?.rfq_data?.project_name || `RFQ-${rfqId.slice(0, 8).toUpperCase()}`;

        if (customerEmail) {
          await fetch('https://www.atlasdt.com/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'rfq_payment',
              email: customerEmail,
              projectName,
              rfqId,
              amountPaid,
              paidAt,
            }),
          });
        }

        return { statusCode: 200, body: JSON.stringify({ handled: 'rfq_payment' }) };
      }

      // ── Subscription / plan payment (existing) ───────────────────
      if (userId) {
        const planType = session.metadata?.planType || 'professional';
        const updates  = { stripe_customer_id: session.customer };
        if (planType === 'designer')     { updates.account_role = 'designer';     updates.role_tier = 'active'; }
        else if (planType === 'entrepreneur') { updates.account_role = 'entrepreneur'; updates.role_tier = 'active'; }
        else                             { updates.tier = 'professional'; }

        const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
        if (error) throw error;
        console.log(`[Webhook] ${planType} access granted to user ${userId}`);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ handled: 'ok' }) };

  } catch (err) {
    console.error('[Webhook] Processing failed:', err);
    return { statusCode: 500, body: 'Webhook processing failed' };
  }
};
