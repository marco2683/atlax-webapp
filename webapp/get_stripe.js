import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.join(process.cwd(), '.env');
const envStr = fs.readFileSync(envPath, 'utf8');
const keyMatch = envStr.match(/STRIPE_SECRET_KEY=(.+)/);
const stripe = new Stripe(keyMatch[1].trim());

async function getLatestCustomer() {
  const customers = await stripe.customers.list({ limit: 5 });
  console.log("RECENT CUSTOMERS:");
  customers.data.forEach(c => {
    console.log(`ID: ${c.id}, Email: ${c.email}, Name: ${c.name}`);
  });
}

getLatestCustomer();
