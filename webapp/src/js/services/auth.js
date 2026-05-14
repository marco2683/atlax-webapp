import { supabase } from '../utils/supabaseClient.js';

// Base URL for auth redirects — always use production URL so email links work
const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

/**
 * Sign up a new user
 * @param {string} email 
 * @param {string} password 
 * @param {object} metadata - Additional info like full_name, company
 * @param {string} [captchaToken] - Optional CAPTCHA token (Turnstile, reCAPTCHA, etc.)
 */
export async function signUpUser(email, password, metadata = {}, captchaToken = null) {
    try {
        // Allow caller to specify a custom redirect path (e.g. /supplier-dashboard.html)
        const redirectPath = metadata._redirectTo || '/index.html?login=true';
        // Build full URL using the production site URL
        const redirectTo = redirectPath.startsWith('http') ? redirectPath : `${SITE_URL}${redirectPath}`;
        // Remove internal key so it doesn't persist in user_metadata
        const cleanMeta = { ...metadata };
        delete cleanMeta._redirectTo;

        const options = {
            data: cleanMeta,
            emailRedirectTo: redirectTo
        };
        if (captchaToken) {
            options.captchaToken = captchaToken;
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options
        });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error("Sign up error:", error.message);
        return { data: null, error };
    }
}

/**
 * Log in an existing user
 * @param {string} email 
 * @param {string} password 
 */
export async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error("Login error:", error.message);
        return { data: null, error };
    }
}

/**
 * Log out the current user
 */
export async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Clear local app state and explicitly redirect to home page
        sessionStorage.removeItem('atlasdt_tier');
        sessionStorage.removeItem('pending_tier_subscription');
        window.location.href = '/index.html';
    } catch (error) {
        console.error("Logout error:", error.message);
        // Force redirect even on error to break loop
        window.location.href = '/index.html';
    }
}

/**
 * Send password reset email
 */
export async function resetPasswordForEmail(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${SITE_URL}/index.html?login=true&type=recovery`
        });
        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Password reset error:', error);
        return { error };
    }
}

/**
 * Update authenticated user's password
 */
export async function updatePassword(newPassword) {
    try {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Password update error:', error);
        return { data: null, error };
    }
}

/**
 * Get current session user
 */
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        return null;
    }
}

/**
 * Listen to auth state changes
 * @param {function} callback - Function to run on state change
 */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}
