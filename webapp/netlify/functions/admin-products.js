import { createClient } from '@supabase/supabase-js';

export const handler = async (event, context) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing Supabase env vars" }) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    if (event.httpMethod === 'DELETE') {
      const { id } = event.queryStringParameters || {};
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: "Missing product id" }) };

      // Delete related records first (pricing tiers, assets, etc.)
      await supabase.from('pricing_tiers').delete().eq('product_id', id);
      await supabase.from('product_assets').delete().eq('product_id', id);

      // Delete the product itself
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;

      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (error) {
    console.error("Admin Products Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
