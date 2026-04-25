import { createClient } from '@supabase/supabase-js';

export const handler = async (event, context) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing Supabase env vars" }) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    if (event.httpMethod === 'GET') {
      const { action, userId, status } = event.queryStringParameters || {};
      
      if (action === 'count') {
        let query = supabase.from('rfq_history').select('id', { count: 'exact', head: true });
        if (userId) query = query.eq('user_id', userId);
        if (status) query = query.eq('status', status);
        
        const { count, error } = await query;
        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify({ count }) };
      }
      
      // Default: fetch all
      const { data, error } = await supabase.from('rfq_history').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify(data) };
    }
    
    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body);
      const { id, updates } = body;
      
      if (!id || !updates) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing id or updates" }) };
      }
      
      const { data, error } = await supabase.from('rfq_history').update(updates).eq('id', id).select();
      if (error) throw error;
      
      return { statusCode: 200, body: JSON.stringify(data) };
    }
    
    if (event.httpMethod === 'DELETE') {
      const { id } = event.queryStringParameters || {};
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: "Missing id" }) };
      
      const { error } = await supabase.from('rfq_history').delete().eq('id', id);
      if (error) throw error;
      
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }
    
    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (error) {
    console.error("Admin RFQs Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
