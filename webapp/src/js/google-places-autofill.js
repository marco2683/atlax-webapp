/**
 * Google Places Autocomplete — Global Address Autofill (v5)
 * ==========================================================
 * Uses AutocompleteSuggestion.fetchAutocompleteSuggestions() for predictions
 * and Place.fetchFields() for details. Fully custom UI — no PlaceAutocompleteElement.
 * This avoids all the event/property access issues with the web component.
 */

/* ── Region mapper ────────────────────────────────────────────────── */
const COUNTRY_TO_REGION = {
  US: 'north_america', CA: 'north_america', MX: 'north_america',
  GB: 'europe', DE: 'europe', FR: 'europe', IT: 'europe', ES: 'europe',
  NL: 'europe', SE: 'europe', NO: 'europe', DK: 'europe', FI: 'europe',
  BE: 'europe', AT: 'europe', CH: 'europe', PL: 'europe', CZ: 'europe',
  IE: 'europe', PT: 'europe',
  AU: 'oceania', NZ: 'oceania',
  CN: 'asia', JP: 'asia', KR: 'asia', SG: 'asia', HK: 'asia',
  TW: 'asia', IN: 'asia', MY: 'asia', TH: 'asia', VN: 'asia',
  ID: 'asia', PH: 'asia'
};

/* ── Extract structured components ───────────────────────────────── */
function extractComponents(addressComponents) {
  const comp = {};
  for (const c of addressComponents) {
    const t = c.types || [];
    if (t.includes('street_number'))               comp.streetNumber = c.longText || c.shortText || '';
    if (t.includes('route'))                       comp.route        = c.longText || c.shortText || '';
    if (t.includes('subpremise'))                   comp.subpremise   = c.longText || c.shortText || '';
    if (t.includes('locality'))                     comp.city         = c.longText || c.shortText || '';
    if (t.includes('administrative_area_level_1'))  comp.state        = c.shortText || c.longText || '';
    if (t.includes('postal_code'))                  comp.postcode     = c.longText || c.shortText || '';
    if (t.includes('country')) {
      comp.countryLong  = c.longText  || '';
      comp.countryShort = c.shortText || '';
    }
    if (t.includes('postal_town') && !comp.city)          comp.city = c.longText || c.shortText || '';
    if (t.includes('sublocality_level_1') && !comp.city)  comp.city = c.longText || c.shortText || '';
  }
  return comp;
}

/* ── Set value on <input> or <select> ────────────────────────────── */
function setField(el, value) {
  if (!el || !value) return;
  if (el.tagName === 'SELECT') {
    const opts = Array.from(el.options);
    let match = opts.find(o => o.value.toUpperCase() === value.toUpperCase());
    if (!match) {
      const region = COUNTRY_TO_REGION[value.toUpperCase()];
      if (region) match = opts.find(o => o.value === region);
    }
    if (!match) match = opts.find(o => o.text.toLowerCase().includes(value.toLowerCase()));
    if (match) el.value = match.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/* ── Flash green border ──────────────────────────────────────────── */
function flashConfirm(elements) {
  elements.forEach(el => {
    if (!el) return;
    const orig = { bc: el.style.borderColor, bs: el.style.boxShadow };
    el.style.transition = 'border-color 0.3s, box-shadow 0.3s';
    el.style.borderColor = '#10b981';
    el.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
    setTimeout(() => { el.style.borderColor = orig.bc; el.style.boxShadow = orig.bs; }, 1500);
  });
}

/* ── Debounce helper ─────────────────────────────────────────────── */
function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ── Instances tracker ───────────────────────────────────────────── */
const _initialised = new Set();

/* ── Main initialiser ────────────────────────────────────────────── */
async function initAddressAutofill(config) {
  const targetEl = typeof config.searchInput === 'string'
    ? document.getElementById(config.searchInput)
    : config.searchInput;

  if (!targetEl) return;
  const uid = typeof config.searchInput === 'string' ? config.searchInput : targetEl.id;
  if (_initialised.has(uid)) return;
  _initialised.add(uid);

  // Load Places library
  let AutocompleteSuggestion, Place;
  try {
    const lib = await google.maps.importLibrary('places');
    AutocompleteSuggestion = lib.AutocompleteSuggestion;
    Place = lib.Place;
  } catch (err) {
    console.warn('[Autofill] Could not load Places library:', err);
    _initialised.delete(uid);
    return;
  }

  // ── Build the search UI ──
  const wrapper = document.createElement('div');
  wrapper.className = 'gpa-search-wrapper';
  wrapper.style.position = 'relative';

  const label = document.createElement('div');
  label.className = 'gpa-search-label';
  label.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path>
    </svg>
    Search Address
  `;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Start typing an address…';
  input.className = 'gpa-search-input';
  input.autocomplete = 'off';

  // Inherit styling from the target element
  const isProfile = targetEl.classList.contains('profile-input');
  const isShipModal = targetEl.classList.contains('ship-input');
  if (isProfile) {
    input.classList.add('profile-input');
  } else if (isShipModal) {
    input.classList.add('ship-input');
    input.style.cssText = targetEl.style.cssText || '';
  } else {
    // Checkout style
    input.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:3px;font-size:14px;box-sizing:border-box;font-family:inherit;';
  }

  const dropdown = document.createElement('div');
  dropdown.className = 'gpa-dropdown';

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  wrapper.appendChild(dropdown);

  // ── Insert into DOM ──
  if (uid === 'chk-address-search') {
    const parentDiv = targetEl.parentElement;
    if (parentDiv) parentDiv.replaceChild(wrapper, targetEl);
  } else {
    const fieldGroup = targetEl.closest('.profile-form-group') ||
      targetEl.closest('.ship-field') ||
      targetEl.closest('div[style*="margin-bottom"]') ||
      targetEl.parentElement;
    if (fieldGroup) {
      const grid = fieldGroup.closest('.profile-form-grid');
      if (grid && grid.parentElement) {
        grid.parentElement.insertBefore(wrapper, grid);
      } else if (fieldGroup.parentElement) {
        fieldGroup.parentElement.insertBefore(wrapper, fieldGroup);
      }
    }
  }

  // ── Session token (for billing efficiency) ──
  let sessionToken = new google.maps.places.AutocompleteSessionToken();

  // ── Fetch suggestions on input ──
  const fetchSuggestions = debounce(async (query) => {
    if (query.length < 3) { dropdown.innerHTML = ''; dropdown.style.display = 'none'; return; }

    try {
      const request = {
        input: query,
        sessionToken,
        includedPrimaryTypes: ['street_address', 'subpremise', 'premise', 'route', 'geocode']
      };

      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

      if (!suggestions || suggestions.length === 0) {
        dropdown.innerHTML = '';
        dropdown.style.display = 'none';
        return;
      }

      dropdown.innerHTML = '';
      dropdown.style.display = 'block';

      for (const suggestion of suggestions) {
        const pred = suggestion.placePrediction;
        if (!pred) continue;

        const item = document.createElement('div');
        item.className = 'gpa-dropdown-item';

        // Bold the main text, grey the secondary
        const mainText = pred.mainText?.text || pred.text?.text || '';
        const secondaryText = pred.secondaryText?.text || '';
        item.innerHTML = `<strong>${mainText}</strong>${secondaryText ? ' <span style="opacity:0.6;">' + secondaryText + '</span>' : ''}`;

        item.addEventListener('mousedown', async (e) => {
          e.preventDefault(); // prevent input blur
          input.value = pred.text?.text || mainText + ', ' + secondaryText;
          dropdown.innerHTML = '';
          dropdown.style.display = 'none';

          // Fetch full place details
          try {
            const place = pred.toPlace();
            await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] });

            const comp = extractComponents(place.addressComponents || []);
            console.log('[Autofill] ✓ Place resolved:', comp);

            const street = [comp.streetNumber, comp.route].filter(Boolean).join(' ');

            const line1El    = config.line1    ? document.getElementById(config.line1)    : null;
            const line2El    = config.line2    ? document.getElementById(config.line2)    : null;
            const cityEl     = config.city     ? document.getElementById(config.city)     : null;
            const stateEl    = config.state    ? document.getElementById(config.state)    : null;
            const postcodeEl = config.postcode ? document.getElementById(config.postcode) : null;
            const countryEl  = config.country  ? document.getElementById(config.country)  : null;

            if (line1El && street)           setField(line1El, street);
            if (line2El && comp.subpremise)  setField(line2El, comp.subpremise);
            if (cityEl && comp.city)         setField(cityEl, comp.city);
            if (stateEl && comp.state)       setField(stateEl, comp.state);
            if (postcodeEl && comp.postcode) setField(postcodeEl, comp.postcode);
            if (countryEl)                   setField(countryEl, comp.countryShort || comp.countryLong);

            flashConfirm([line1El, line2El, cityEl, stateEl, postcodeEl, countryEl]);

            // Refresh session token for next search
            sessionToken = new google.maps.places.AutocompleteSessionToken();

          } catch (err) {
            console.error('[Autofill] Place fetch error:', err);
          }
        });

        dropdown.appendChild(item);
      }
    } catch (err) {
      console.warn('[Autofill] Suggestion fetch error:', err);
      dropdown.innerHTML = '';
      dropdown.style.display = 'none';
    }
  }, 300);

  input.addEventListener('input', () => fetchSuggestions(input.value));

  // Close dropdown on blur (with delay to allow click)
  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 200);
  });

  // Re-show on focus if there's text
  input.addEventListener('focus', () => {
    if (input.value.length >= 3 && dropdown.children.length > 0) {
      dropdown.style.display = 'block';
    }
  });
}

/* ── Auto-attach ─────────────────────────────────────────────────── */
async function autoAttachAllAddressFields() {
  if (document.getElementById('chk-address-search')) {
    await initAddressAutofill({
      searchInput: 'chk-address-search',
      line1: 'chk-address1', line2: 'chk-address2',
      city: 'chk-city', state: 'chk-state',
      postcode: 'chk-zip', country: 'chk-country'
    });
  }
  if (document.getElementById('chk-bill-address1')) {
    await initAddressAutofill({
      searchInput: 'chk-bill-address1',
      line1: 'chk-bill-address1',
      city: 'chk-bill-city', state: 'chk-bill-state',
      postcode: 'chk-bill-zip'
    });
  }
  if (document.getElementById('ship-modal-address1')) {
    await initAddressAutofill({
      searchInput: 'ship-modal-address1',
      line1: 'ship-modal-address1', line2: 'ship-modal-address2',
      city: 'ship-modal-city', state: 'ship-modal-province',
      postcode: 'ship-modal-postcode', country: 'ship-modal-country'
    });
  }
  if (document.getElementById('bill-line1')) {
    await initAddressAutofill({
      searchInput: 'bill-line1',
      line1: 'bill-line1', line2: 'bill-line2',
      city: 'bill-city', state: 'bill-state',
      postcode: 'bill-postcode', country: 'bill-country'
    });
  }
  if (document.getElementById('ship-line1')) {
    await initAddressAutofill({
      searchInput: 'ship-line1',
      line1: 'ship-line1', line2: 'ship-line2',
      city: 'ship-city', state: 'ship-state',
      postcode: 'ship-postcode', country: 'ship-country'
    });
  }
}

/* ── Boot ─────────────────────────────────────────────────────────── */
async function boot() {
  if (typeof google === 'undefined' || !google.maps) return;
  try {
    await autoAttachAllAddressFields();
    console.log('[Address Autofill] ✓ Initialised');
  } catch (err) {
    console.warn('[Address Autofill] Boot error:', err);
  }
}

window.initGooglePlaces = function () { boot(); };
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => boot());
} else {
  boot();
}
window.initAddressAutofill = initAddressAutofill;
window.autoAttachAllAddressFields = autoAttachAllAddressFields;
