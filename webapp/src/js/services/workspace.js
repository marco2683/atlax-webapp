/* ============================================================
   PRD — Workspace Service Layer
   CRUD operations for shortlists, RFQs, and file vault
   ============================================================ */

import { supabase } from '../utils/supabaseClient.js';

// ── Shortlists ─────────────────────────────────────────────

/**
 * Get all saved shortlists for the current user
 */
export async function getShortlists() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('shortlists')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) { console.error('[Workspace] Shortlists fetch error:', error.message); return []; }
  return data || [];
}

/**
 * Save a new shortlist
 */
export async function saveShortlist(name, suppliers, meta = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  // Store full supplier objects for offline rendering
  const { data, error } = await supabase
    .from('shortlists')
    .insert({
      user_id: user.id,
      name,
      supplier_ids: suppliers.map(s => s.supplier?.id || s.supplier?.name || s.id || s.name),
      meta: { ...meta, suppliers_snapshot: suppliers }
    })
    .select()
    .single();

  if (error) { console.error('[Workspace] Shortlist save error:', error.message); return { data: null, error }; }
  return { data, error: null };
}

/**
 * Delete a shortlist
 */
export async function deleteShortlist(shortlistId) {
  const { error } = await supabase
    .from('shortlists')
    .delete()
    .eq('id', shortlistId);

  if (error) { console.error('[Workspace] Shortlist delete error:', error.message); return { error }; }
  return { error: null };
}

/**
 * Rename a shortlist
 */
export async function renameShortlist(shortlistId, newName) {
  const { data, error } = await supabase
    .from('shortlists')
    .update({ name: newName })
    .eq('id', shortlistId)
    .select()
    .single();

  if (error) { console.error('[Workspace] Shortlist rename error:', error.message); return { data: null, error }; }
  return { data, error: null };
}


// ── RFQ History ────────────────────────────────────────────

/**
 * Get all RFQs for the current user
 */
export async function getRFQs() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('rfq_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) { console.error('[Workspace] RFQ fetch error:', error.message); return []; }
  return data || [];
}

/**
 * Update an RFQ's status
 */
export async function updateRFQStatus(rfqId, newStatus) {
  const { data, error } = await supabase
    .from('rfq_history')
    .update({ status: newStatus })
    .eq('id', rfqId)
    .select()
    .single();

  if (error) { console.error('[Workspace] RFQ status update error:', error.message); return { data: null, error }; }
  return { data, error: null };
}

/**
 * Delete / cancel an RFQ
 */
export async function cancelRFQ(rfqId) {
  return updateRFQStatus(rfqId, 'cancelled');
}

/**
 * Solicit / nudge a supplier for an RFQ
 * (In production this would send an email; here we just update metadata)
 */
export async function solicitRFQ(rfqId) {
  const { data: existing } = await supabase
    .from('rfq_history')
    .select('rfq_data')
    .eq('id', rfqId)
    .single();

  const rfqData = existing?.rfq_data || {};
  rfqData.last_solicited = new Date().toISOString();
  rfqData.solicit_count = (rfqData.solicit_count || 0) + 1;

  const { data, error } = await supabase
    .from('rfq_history')
    .update({ rfq_data: rfqData })
    .eq('id', rfqId)
    .select()
    .single();

  if (error) { console.error('[Workspace] RFQ solicit error:', error.message); return { data: null, error }; }
  return { data, error: null };
}


// ── File Vault ─────────────────────────────────────────────

/**
 * Get all files for the current user
 */
export async function getFiles() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_files')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) { console.error('[Workspace] Files fetch error:', error.message); return []; }
  return data || [];
}

/**
 * Register a file upload in the database
 */
export async function registerFile(fileName, fileType, fileSize, storagePath, category = 'general', meta = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('user_files')
    .insert({
      user_id: user.id,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      storage_path: storagePath,
      category,
      meta
    })
    .select()
    .single();

  if (error) { console.error('[Workspace] File register error:', error.message); return { data: null, error }; }
  return { data, error: null };
}

/**
 * Delete a file record (and optionally from storage)
 */
export async function deleteFile(fileId) {
  // Get storage path first
  const { data: file } = await supabase
    .from('user_files')
    .select('storage_path')
    .eq('id', fileId)
    .single();

  // Delete from storage if path exists
  if (file?.storage_path) {
    await supabase.storage.from('user-files').remove([file.storage_path]);
  }

  // Delete DB record
  const { error } = await supabase
    .from('user_files')
    .delete()
    .eq('id', fileId);

  if (error) { console.error('[Workspace] File delete error:', error.message); return { error }; }
  return { error: null };
}

/**
 * Update a file's metadata (e.g. folder assignment)
 */
export async function updateFileMeta(fileId, updates) {
  const { data, error } = await supabase
    .from('user_files')
    .update(updates)
    .eq('id', fileId)
    .select()
    .single();

  if (error) { console.error('[Workspace] File update error:', error.message); return { data: null, error }; }
  return { data, error: null };
}

/**
 * Upload a file to Supabase Storage and register it in the database.
 * Storage upload MUST succeed before we create a DB record.
 */
export async function uploadFile(file, category = 'general') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const ext = file.name.split('.').pop().toLowerCase();
  // Sanitize filename for storage (replace spaces and special chars)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${user.id}/${Date.now()}_${safeName}`;

  // Upload to storage — this MUST succeed
  try {
    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[Workspace] Storage upload failed:', uploadError.message);
      return { data: null, error: uploadError };
    }
  } catch (err) {
    console.error('[Workspace] Storage unavailable:', err.message);
    return { data: null, error: err };
  }

  // Storage succeeded — now register in DB
  return registerFile(
    file.name,
    ext,
    file.size,
    storagePath,
    category,
    { storage_status: 'uploaded' }
  );
}
