import { supabase } from '../utils/supabaseClient.js';

/**
 * Get the profile of the currently logged-in user
 */
export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('[Profile] Error fetching profile:', error.message);
    return null;
  }
  return data;
}

/**
 * Update the profile of the currently logged-in user
 * @param {object} updates - Fields to update (first_name, last_name, company, job_title, etc.)
 */
export async function updateMyProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[Profile] Error updating profile:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Get the shortlists saved by the currently logged-in user
 */
export async function getMySavedShortlists() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('shortlists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Profile] Error fetching shortlists:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Save the current shortlist to the database
 * @param {string} name - A name for this shortlist
 * @param {Array} supplierIds - Array of supplier IDs
 * @param {object} meta - Any extra metadata (e.g. search query)
 */
export async function saveShortlist(name, supplierIds, meta = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('shortlists')
    .insert({
      user_id: user.id,
      name,
      supplier_ids: supplierIds,
      meta: { ...meta, suppliers_snapshot: meta.items || meta.suppliers_snapshot || [] }
    })
    .select()
    .single();

  if (error) {
    console.error('[Profile] Error saving shortlist:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Submit an RFQ and save it to history
 * @param {object} rfqData - The full RFQ form data
 */
export async function submitRFQ(rfqData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('rfq_history')
    .insert({ user_id: user.id, rfq_data: rfqData, status: 'submitted' })
    .select()
    .single();

  if (error) {
    console.error('[RFQ] Error submitting RFQ:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Get RFQ history for the current user
 */
export async function getMyRFQHistory() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('rfq_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[RFQ] Error fetching RFQ history:', error.message);
    return [];
  }
  return data || [];
}
