/**
 * Serverless Curator Images Manager — handles add/remove of taxonomy images
 * using Supabase as the persistent store.
 * 
 * Uses a `taxonomy_images` table in Supabase:
 *   CREATE TABLE taxonomy_images (
 *     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     tech_id text NOT NULL,
 *     image_url text NOT NULL,
 *     created_at timestamptz DEFAULT now(),
 *     UNIQUE(tech_id, image_url)
 *   );
 *
 * POST /.netlify/functions/curator-manage
 * Body: { action: "add"|"remove"|"list", techId, imageUrl? }
 */

import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing Supabase env vars' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { action, techId, imageUrl } = body;

  try {
    if (action === 'add') {
      if (!techId || !imageUrl) {
        return { statusCode: 400, body: JSON.stringify({ error: 'techId and imageUrl required' }) };
      }

      const { error } = await supabase
        .from('taxonomy_images')
        .upsert({ tech_id: techId, image_url: imageUrl }, { onConflict: 'tech_id,image_url' });

      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };

    } else if (action === 'remove') {
      if (!techId || !imageUrl) {
        return { statusCode: 400, body: JSON.stringify({ error: 'techId and imageUrl required' }) };
      }

      const { error } = await supabase
        .from('taxonomy_images')
        .delete()
        .eq('tech_id', techId)
        .eq('image_url', imageUrl);

      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };

    } else if (action === 'list') {
      // List all images, optionally filtered by techId
      let query = supabase.from('taxonomy_images').select('*');
      if (techId) query = query.eq('tech_id', techId);
      
      const { data, error } = await query;
      if (error) throw error;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: data || [] })
      };

    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action. Use add, remove, or list.' }) };
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
