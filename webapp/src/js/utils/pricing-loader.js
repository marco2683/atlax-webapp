/**
 * pricing-loader.js
 * ────────────────────────────────────────────────────────
 * Manages the transition between static pricing-config.json
 * and live Supabase-driven pricing rules.
 * ────────────────────────────────────────────────────────
 */

import { supabase } from './supabaseClient.js';
import STATIC_CONFIG from '../data/pricing-config.json';

let liveConfig = null;

/**
 * Fetches the active pricing configuration from Supabase.
 * Returns the static fallback if fetch fails or table is empty.
 */
export async function loadPricingConfig() {
    try {
        const { data, error } = await supabase
            .from('pricing_configs')
            .select('config')
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (data && data.config) {
            console.log('[PricingLoader] Live config loaded from Supabase.');
            liveConfig = data.config;
            return liveConfig;
        }
    } catch (err) {
        console.warn('[PricingLoader] Failed to load live config, using static fallback.', err.message);
    }
    
    liveConfig = STATIC_CONFIG;
    return liveConfig;
}

/**
 * Returns the currently loaded config. 
 * If not loaded yet, returns the static fallback.
 */
export function getActivePricingConfig() {
    let cfg = liveConfig || STATIC_CONFIG;
    // Unwrap nested .default properties which can happen if Vite imports wrap it 
    // and then we accidentally save the wrapped object back into Supabase.
    while (cfg && cfg.default) {
        cfg = cfg.default;
    }
    
    if (!cfg || !cfg.technologies) {
        console.error('[PricingLoader] CRITICAL ERROR: Config is missing technologies! Falling back to raw STATIC_CONFIG', cfg);
        return STATIC_CONFIG; // Absolute fallback
    }
    
    return cfg;
}
