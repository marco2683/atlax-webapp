import os
import re

filepath = 'c:/Users/sebas/OneDrive/Desktop/DUMP/Antigravity Projects/002_Pearl River Delta PRD/webapp/src/js/components/rfq-controller.js'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# We need to replace `initRFQController()` function.
# Let's find its start and find `// ── Rich Text Editor Handlers ────────────────────────`
start_idx = text.find('export function initRFQController() {')
end_idx = text.find('// ── Rich Text Editor Handlers ────────────────────────')

new_init = """export function initRFQController() {
  console.log('--- [DEBUG TRACE] ENTERING initRFQController (v6) ---');
  const panels       = document.getElementById('rfq-dynamic-parts-container');
  const submitBtn    = document.getElementById('rfq-submit-btn');

  if (!panels) {
    console.warn('[RFQ] Controller elements not found.');
    return;
  }

  // Handle Main Drag & Drop Zone
  const mainDropZone = document.getElementById('rfq-main-upload-zone');
  const mainFileInput = document.getElementById('rfq-main-file-input');
  const mainSelectBtn = document.getElementById('rfq-main-select-btn');
  
  if (mainDropZone && mainFileInput) {
    mainSelectBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      mainFileInput.click();
    });
    mainDropZone.addEventListener('click', (e) => {
      if (e.target.closest('.upload-icon') || e.target.closest('.upload-text')) {
        mainFileInput.click();
      }
    });
    mainDropZone.addEventListener('dragover', (e) => { e.preventDefault(); mainDropZone.classList.add('drag-over'); });
    mainDropZone.addEventListener('dragleave', () => mainDropZone.classList.remove('drag-over'));
    mainDropZone.addEventListener('drop', (e) => {
      e.preventDefault(); mainDropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) processMainUpload(e.dataTransfer.files);
    });
    mainFileInput.addEventListener('change', () => {
      if (mainFileInput.files.length > 0) processMainUpload(mainFileInput.files);
      mainFileInput.value = ''; // allow re-upload
    });
  }

  // Handle Shipping calculation toggle
  const calcShippingCb = document.getElementById('calc-shipping-cb');
  const shippingSection = document.getElementById('shipping-details-section');
  if (calcShippingCb && shippingSection) {
    calcShippingCb.addEventListener('change', (e) => {
      if (e.target.checked) {
        shippingSection.classList.remove('hidden');
      } else {
        shippingSection.classList.add('hidden');
      }
      calculateAndDisplayQuote();
    });
  }

  // Real-time recalculation after first quote
  panels.addEventListener('change', (e) => {
    // If technology changed, check if we need to remove the yellow accent
    if (e.target.matches('.rfq-process')) {
      const partIdx = e.target.dataset.part;
      const card = document.querySelector(`.rfq-part-card[data-part="${partIdx}"]`);
      if (card && e.target.value) {
        card.classList.remove('needs-tech-selection');
        card.style.borderColor = 'rgba(16, 185, 129, 0.4)'; // green border
        card.style.background = 'rgba(0, 0, 0, 0.15)'; // reset bg
      }
    }
    if (hasQuotedOnce && e.target.matches('.rfq-process, .rfq-material, .rfq-finish, .rfq-lead-time, .rfq-tooling-type, .rfq-tooling-cavities, .rfq-quantity, .rfq-other-tech, .rfq-other-material, .rfq-color, .rfq-threads, .rfq-tolerance')) {
      calculateAndDisplayQuote();
    }
  });

  panels.addEventListener('input', (e) => {
    if (hasQuotedOnce && e.target.matches('.rfq-quantity, .rfq-other-tech, .rfq-other-material, .rfq-color, .rfq-threads, .rfq-tolerance')) {
      calculateAndDisplayQuote();
    }
  });

  // Handle Remove Part button
  panels.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.rfq-part-remove');
    if (removeBtn) {
      e.stopPropagation();
      const partIdx = parseInt(removeBtn.dataset.part);
      removePartCard(partIdx);
    }
  });

  // Wire the "clear all" button in the quote result panel
  document.getElementById('rfq-clear-all-parts')?.addEventListener('click', () => {
    document.getElementById('rfq-dynamic-parts-container').innerHTML = '';
    quotedParts.clear();
    partState.clear();
    partCount = 1;
    renderQuoteResult();
    updateSubmitButtonState();
  });

  // Wire checkout and request quote buttons
  document.getElementById('rfq-submit-verification-btn')?.addEventListener('click', async () => {
    if (quotedParts.size === 0) return;
    
    const { getCurrentUser } = await import('../services/auth.js');
    const user = await getCurrentUser();
    if (!user) { alert('Please log in to submit a quote request.'); return; }
    
    const btn = document.getElementById('rfq-submit-verification-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    const rfqId = window.crypto?.randomUUID?.() || Date.now().toString();
    const partsArray = Array.from(quotedParts.values());
    const projNameInput = document.getElementById('instant-rfq-project-name')?.value?.trim();
    const projName = projNameInput || partsArray[0]?.file?.name?.split('.')[0] || 'Instant RFQ Project';
    
    let grandTotal = 0;
    partsArray.forEach(p => { grandTotal += (p.quote?.totalPrice || 0); });

    const uploadedParts = [];
    for (const p of partsArray) {
      let storagePath = null;
      let bucket = 'rfq-uploads';
      if (p.file) {
        const fileExt = p.file.name.split('.').pop();
        storagePath = `${user.id}/${rfqId}/${Date.now()}_${Math.random().toString(36).substring(2,9)}.${fileExt}`;
        const { supabase } = await import('../utils/supabaseClient.js');
        const { error } = await supabase.storage.from('rfq-uploads').upload(storagePath, p.file, {
          cacheControl: '3600', upsert: false
        });
        if (error) {
           const { error: fErr } = await supabase.storage.from('user-files').upload(storagePath, p.file, {
             cacheControl: '3600', upsert: false
           });
           if (!fErr) bucket = 'user-files';
           else storagePath = null;
        }
      }
      uploadedParts.push({ ...p, storage_path: storagePath, bucket: bucket });
    }

    const rfqData = {
      type: 'instant',
      project_name: projName,
      service: 'Instant Quote',
      estimated_quantity: partsArray.reduce((acc, p) => acc + (p.qty || 1), 0),
      total_price: grandTotal,
      target_timeline: 'Flexible',
      notes: 'Generated via Instant Quoting Engine',
      parts: uploadedParts.map(p => ({
        name: p.partName || `Part ${p.config?.process || ''}`,
        process: p.config?.process || p.quote?.techLabel || '',
        qty: p.config?.quantity || 1,
        material: p.config?.material || p.quote?.materialLabel || '',
        finish: p.config?.finish || '',
        price: p.quote?.totalPrice || 0,
        storage_path: p.storage_path,
        bucket: p.bucket
      })),
      submitted_at: new Date().toISOString()
    };

    try {
      const { supabase } = await import('../utils/supabaseClient.js');
      const { error: rfqError } = await supabase.from('rfq_history').insert({
        id: rfqId,
        user_id: user.id,
        rfq_data: rfqData,
        status: 'submitted'
      });
      if (rfqError) throw rfqError;

      const { data: profileData } = await supabase.from('profiles').select('first_name, last_name, company').eq('id', user.id).single();
      const userName = profileData ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : user.email;
      
      await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'project_rfq',
          email: user.email,
          userId: user.id,
          name: userName,
          company: profileData?.company || '',
          projectName: projName,
          service: 'Instant Quote',
          quantity: rfqData.estimated_quantity,
          timeline: 'Flexible',
          fileCount: partsArray.length,
          fileNames: partsArray.map(p => p.partName)
        })
      }).catch(e => console.warn('Email notify error:', e));

      await fetch('/.netlify/functions/submit-rfq-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: userName,
          email: user.email,
          part_name: projName,
          material: partsArray[0]?.quote?.materialLabel || 'Various',
          estimated_cost: `$${grandTotal.toFixed(2)}`
        })
      }).catch(e => console.warn('Planner notify error:', e));

      // showRFQSuccessModal('quote'); (if implemented)
      alert("Quote submitted successfully!");
      document.getElementById('rfq-clear-all-parts')?.click();
    } catch (e) {
      console.error('[RFQ] Instant quote error:', e);
      alert('Failed to submit quote: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  // Wire "Submit" button
  submitBtn?.addEventListener('click', () => calculateAndDisplayQuote());

  // Initialize result panel
  renderQuoteResult();

  console.log('[RFQ] Controller initialized (v6).');
}

  """

text = text[:start_idx] + new_init + text[end_idx:]

# Also replace .rfq-part-panel with .rfq-part-card everywhere in wirePartPanel and updateSubmitButtonState
text = text.replace('.rfq-part-panel', '.rfq-part-card')

# Also remove appendBulkFiles since it's obsolete
text = re.sub(r'function appendBulkFiles\(fileList\) \{.*?\n\}', '', text, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
