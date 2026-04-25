import { createClient } from '@supabase/supabase-js';

export const handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing Supabase env vars" }) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Get all profiles (includes role, designer_status, etc.)
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) throw error;

    // 2. Get all auth users (has the signup email) using service role
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authErr) throw authErr;

    // 3. Build a map: user_id -> email
    const emailMap = {};
    (users || []).forEach(u => { emailMap[u.id] = u.email; });

    // 4. Merge email into each profile
    const enriched = (profiles || []).map(p => ({
      ...p,
      email: emailMap[p.id] || p.email || null,
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enriched),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
