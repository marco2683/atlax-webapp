import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
    console.error(`Webhook Error: ${err.message}`);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const userId = session.client_reference_id;
      
      console.log(`[Stripe Webhook] Received payment for user ${userId}`);

      if (userId) {
        const planType = session.metadata?.planType || 'professional';
        
        // Define updates dynamically based on planType
        const updates = { stripe_customer_id: session.customer };
        if (planType === 'designer') {
          updates.account_role = 'designer';
          updates.role_tier = 'active';
        } else if (planType === 'entrepreneur') {
          updates.account_role = 'entrepreneur';
          updates.role_tier = 'active';
        } else {
          // Assume default professional tier access
          updates.tier = 'professional';
        }

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);
          
        if (error) {
          console.error("Failed to update user tier in Supabase:", error);
          throw error;
        }
        console.log(`[Stripe Webhook] Set ${planType} access for user ${userId} / cust ${session.customer}`);
      }
    }

    return { statusCode: 200, body: 'Webhook handled' };

  } catch (err) {
    console.error('Webhook processing failed:', err);
    return { statusCode: 500, body: 'Webhook processing failed' };
  }
};
