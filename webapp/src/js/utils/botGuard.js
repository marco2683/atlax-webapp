/**
 * Bot Guard — Multi-layered bot detection for signup forms
 * 
 * Layers:
 * 1. Honeypot: Hidden field that bots auto-fill but humans never see
 * 2. Timing:   Reject submissions faster than a human can type
 * 3. Gibberish: Detect random-string names/companies via entropy scoring
 */

const BOT_GUARD_CONFIG = {
  MIN_FILL_TIME_MS: 3000,       // 3 seconds minimum to fill form
  HONEYPOT_FIELD_NAME: 'website_url',  // Tempting name that bots auto-fill
  MAX_ENTROPY_THRESHOLD: 4.2,   // Shannon entropy — English text ~3.5, random strings ~4.5+
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 40,
};

let _formLoadedAt = null;

/**
 * Call this when the signup form becomes visible (e.g. on modal open or page load)
 */
export function markFormLoaded() {
  _formLoadedAt = Date.now();
}

/**
 * Inject a hidden honeypot field into the signup form.
 * The field is invisible to real users but bots will auto-fill it.
 * Call this after the DOM is ready.
 * 
 * @param {HTMLFormElement|string} formOrId - The form element or its ID
 */
export function injectHoneypot(formOrId) {
  const form = typeof formOrId === 'string' 
    ? document.getElementById(formOrId) 
    : formOrId;
  if (!form) return;

  // Don't inject twice
  if (form.querySelector(`[name="${BOT_GUARD_CONFIG.HONEYPOT_FIELD_NAME}"]`)) return;

  const wrapper = document.createElement('div');
  // Use multiple obfuscation techniques so bots don't detect it
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.cssText = 'position:absolute;left:-9999px;top:-9999px;height:0;width:0;overflow:hidden;opacity:0;pointer-events:none;';
  wrapper.tabIndex = -1;

  const input = document.createElement('input');
  input.type = 'text';
  input.name = BOT_GUARD_CONFIG.HONEYPOT_FIELD_NAME;
  input.id = `hp-${BOT_GUARD_CONFIG.HONEYPOT_FIELD_NAME}`;
  input.autocomplete = 'off';
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');

  wrapper.appendChild(input);
  form.appendChild(wrapper);
}

/**
 * Calculate Shannon entropy of a string.
 * English text ≈ 3.0–3.8, random ASCII ≈ 4.5+
 */
function shannonEntropy(str) {
  if (!str || str.length < 3) return 0;
  const freq = {};
  for (const ch of str.toLowerCase()) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  const len = str.length;
  let entropy = 0;
  for (const ch in freq) {
    const p = freq[ch] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Check if a string looks like gibberish (random bot-generated text).
 * Heuristics:
 *  - High Shannon entropy
 *  - Too many consonant clusters (no vowels)
 *  - Mix of upper/lower without word boundaries
 */
function isGibberish(str) {
  if (!str || str.length < 3) return false;
  
  const clean = str.trim();
  
  // Length check — names/companies over 40 chars are suspicious
  if (clean.length > BOT_GUARD_CONFIG.MAX_NAME_LENGTH) return true;

  // Entropy check
  const entropy = shannonEntropy(clean);
  if (entropy > BOT_GUARD_CONFIG.MAX_ENTROPY_THRESHOLD && clean.length > 8) return true;

  // Consonant cluster check — more than 4 consonants in a row is rare in real names
  const consonantCluster = clean.match(/[bcdfghjklmnpqrstvwxyz]{5,}/gi);
  if (consonantCluster && consonantCluster.length > 0) return true;

  // Random case switching check — "jRMgzwtUWiNHCECnTZZzpm" pattern
  const caseChanges = clean.split('').reduce((count, ch, i) => {
    if (i === 0) return 0;
    const prevUpper = clean[i - 1] === clean[i - 1].toUpperCase() && clean[i - 1] !== clean[i - 1].toLowerCase();
    const currUpper = ch === ch.toUpperCase() && ch !== ch.toLowerCase();
    const prevLower = clean[i - 1] === clean[i - 1].toLowerCase() && clean[i - 1] !== clean[i - 1].toUpperCase();
    const currLower = ch === ch.toLowerCase() && ch !== ch.toUpperCase();
    if ((prevUpper && currLower) || (prevLower && currUpper)) return count + 1;
    return count;
  }, 0);
  // Real names have 1–2 case changes (e.g., "McDonald"), but gibberish has many
  if (caseChanges > 4 && clean.length > 6) return true;

  return false;
}

/**
 * Check if an email looks like a bot-generated dot-stuffed Gmail address.
 * Pattern: "a.ndyr.ubenste.i.n@gmail.com" — unusual dot placement
 */
function isDotStuffedEmail(email) {
  if (!email) return false;
  const localPart = email.split('@')[0];
  const domain = email.split('@')[1]?.toLowerCase();
  
  // Only apply to Gmail since dots don't matter to Gmail (bots exploit this)
  if (domain !== 'gmail.com') return false;
  
  const dotCount = (localPart.match(/\./g) || []).length;
  const cleanLength = localPart.replace(/\./g, '').length;
  
  // More than 3 dots in the local part is highly suspicious for Gmail
  if (dotCount >= 3) return true;
  
  // Dot ratio: if more than 30% of the local part is dots, it's suspicious
  if (dotCount > 0 && dotCount / cleanLength > 0.3) return true;

  return false;
}

/**
 * Run all bot detection checks against the signup data.
 * 
 * @param {object} data - { firstName, lastName, company, email }
 * @param {HTMLFormElement|string} formOrId - The form element or its ID (for honeypot check)
 * @returns {{ isBot: boolean, reason: string|null }}
 */
export function checkForBot(data, formOrId) {
  const { firstName, lastName, company, email } = data;

  // 1. Honeypot check
  const form = typeof formOrId === 'string'
    ? document.getElementById(formOrId)
    : formOrId;
  if (form) {
    const honeypot = form.querySelector(`[name="${BOT_GUARD_CONFIG.HONEYPOT_FIELD_NAME}"]`);
    if (honeypot && honeypot.value.trim() !== '') {
      return { isBot: true, reason: 'honeypot' };
    }
  }

  // 2. Timing check
  if (_formLoadedAt) {
    const elapsed = Date.now() - _formLoadedAt;
    if (elapsed < BOT_GUARD_CONFIG.MIN_FILL_TIME_MS) {
      return { isBot: true, reason: 'too_fast' };
    }
  }

  // 3. Gibberish detection on name fields
  if (isGibberish(firstName)) {
    return { isBot: true, reason: 'gibberish_first_name' };
  }
  if (isGibberish(lastName)) {
    return { isBot: true, reason: 'gibberish_last_name' };
  }
  if (isGibberish(company)) {
    return { isBot: true, reason: 'gibberish_company' };
  }

  // 4. Dot-stuffed Gmail detection
  if (isDotStuffedEmail(email)) {
    return { isBot: true, reason: 'dot_stuffed_email' };
  }

  return { isBot: false, reason: null };
}
