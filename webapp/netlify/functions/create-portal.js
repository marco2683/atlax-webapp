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

  try {
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
    }

    // Attempt to lookup Stripe Customer ID from Supabase
    // Ideally, Stripe Webhook writes the `stripe_customer_id` back to the profiles table
    // For now, if we don't have it, we must decline generating a portal.
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (error || !profile?.stripe_customer_id) {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ error: 'No active Stripe customer found for this account' }) 
      };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: 'https://atlax.co/profile.html',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };
    
  } catch (err) {
    console.error('Portal error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to access customer portal' })
    };
  }
};
