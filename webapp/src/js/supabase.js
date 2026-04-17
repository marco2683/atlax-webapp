// Single source of truth for the Supabase client.
// Both this file and utils/supabaseClient.js now point to the same module
// instance, preventing the "Multiple GoTrueClient instances" warning.
export { supabase } from './utils/supabaseClient.js';
