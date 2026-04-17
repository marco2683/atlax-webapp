import { createClient } from '@supabase/supabase-js';

/**
 * Netlify Function: storage-upload
 * Proxies file uploads to Supabase Storage using the service_role key,
 * bypassing all RLS policies on storage.objects.
 *
 * Expects multipart/form-data with:
 *   - file: the binary file
 *   - path: the storage path (e.g. "supplier_id/filename.png")
 *   - bucket: bucket name (default: "product_assets")
 */
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

  try {
    // Parse the JSON body (file sent as base64)
    const body = JSON.parse(event.body);
    const { fileBase64, fileName, filePath, contentType, bucket = 'product_assets' } = body;

    if (!fileBase64 || !filePath) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing fileBase64 or filePath' }) };
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        upsert: true,
        contentType: contentType || 'application/octet-stream',
        cacheControl: '3600'
      });

    if (error) {
      return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    }

    // Get public URL
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        path: data.path,
        publicUrl: publicData.publicUrl
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
