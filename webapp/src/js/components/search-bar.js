/* ============================================================
   PRD — Search Bar Component
   ============================================================ */

/**
 * Initialize the search bar with submit handling.
 * @param {Function} onSearch - Callback fired with the search query string
 */
export function initSearchBar(onSearch) {
  const input = document.getElementById('search-input');
  const submit = document.getElementById('search-submit');
  const bar = document.getElementById('search-bar');

  if (!input || !submit) return;

  // ── Submit Handler ─────────────────────────────────────
  function handleSearch() {
    const query = input.value.trim();
    if (!query) {
      // Shake animation for empty search
      bar.classList.add('search-bar--shake');
      setTimeout(() => bar.classList.remove('search-bar--shake'), 500);
      return;
    }

    // Visual feedback
    submit.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div>';
    submit.disabled = true;

    // Fire callback
    if (typeof onSearch === 'function') {
      onSearch(query);
    }

    // Reset button after brief delay (Sprint 2: this waits for API response)
    setTimeout(() => {
      submit.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
      submit.disabled = false;
    }, 1500);
  }

  // Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Click submit
  submit.addEventListener('click', handleSearch);

  // ── Shake Animation (injected CSS) ─────────────────────
  if (!document.getElementById('search-shake-css')) {
    const style = document.createElement('style');
    style.id = 'search-shake-css';
    style.textContent = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-6px); }
        40%, 80% { transform: translateX(6px); }
      }
      .search-bar--shake {
        animation: shake 0.4s ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }
}
