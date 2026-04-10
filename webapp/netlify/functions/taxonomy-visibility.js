/**
 * Netlify Function: taxonomy-visibility
 * Manages enabled/disabled state for taxonomy categories and technologies.
 * 
 * GET  → list all visibility overrides
 * POST → upsert visibility { id, enabled }
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // GET — return all visibility records
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('taxonomy_visibility')
        .select('*');
      
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data || []) };
    }

    // POST — upsert visibility toggle
    if (event.httpMethod === 'POST') {
      const { id, enabled } = JSON.parse(event.body);
      if (!id || typeof enabled !== 'boolean') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id and enabled (boolean) required' }) };
      }

      const { error } = await supabase
        .from('taxonomy_visibility')
        .upsert({ id, enabled, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, id, enabled }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('Visibility error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
}
