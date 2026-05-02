/**
 * Manual Document Modal — Standalone Quote / Invoice Creator
 * Launched from Admin RFQ Tracker via +Manual Quote / +Manual Invoice buttons
 */
import { generatePDF, uploadAndSyncDoc, getLogoBase64 } from './headless-docs.js';

function uid4() { return Math.random().toString(36).slice(2,6).toUpperCase(); }
function today() { return new Date().toISOString().slice(0,10); }
function fmt(n) { return Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

const DOC_CFG = {
  quotation: { title: 'Quotation', prefix: 'QT' },
  invoice:   { title: 'Commercial Invoice', prefix: 'INV' },
};

/**
 * Opens the manual document editor modal.
 * @param {'quotation'|'invoice'} docType
 */
export function openManualDocModal(docType = 'quotation') {
  const cfg = DOC_CFG[docType] || DOC_CFG.quotation;
  const docRef = `${cfg.prefix}-${uid4()}`;

  // State
  const state = {
    docRef,
    date: today(),
    dueDate: '',
    projectName: '',
    customer: { name: '', company: '', email: '', addr1: '', addr2: '', city: '', state: '', postcode: '', phone: '' },
    shipSameAsBill: true,
    shipTo: { name: '', company: '', addr1: '', addr2: '', city: '', state: '', postcode: '', phone: '' },
    lineItems: [{ description: '', details: '', qty: 1, unitPrice: 0, thumbnail: null }],
    includeGst: false,
    notes: 'Payment due within 14 days of issue date.\nPrices quoted in USD. All prices are EXW unless otherwise specified.\n\nBank Transfer Details:\nBank: NAB — National Australia Bank\nAccount Name: Paniani Products Pty Ltd\nBSB: 083-004  |  Account No: 978 360 554\nSWIFT / BIC: NATAAU3303',
  };

  const overlay = document.createElement('div');
  overlay.id = 'manual-doc-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;';

  function render() {
    const subtotal = state.lineItems.reduce((s, li) => s + (Number(li.qty)||0) * (Number(li.unitPrice)||0), 0);
    const gst = state.includeGst ? subtotal * 0.10 : 0;
    const total = subtotal + gst;

    overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:960px;max-width:95vw;height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.4);">

      <!-- Header -->
      <div style="padding:16px 24px;border-bottom:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
        <div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;">${cfg.title}</div>
          <div style="font-size:11px;color:#64748b;font-family:'SF Mono',monospace;">${state.docRef}</div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;">
          <label style="font-size:11px;color:#64748b;font-weight:600;">Date
            <input type="date" id="mdm-date" value="${state.date}" style="margin-left:4px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;">
          </label>
          <label style="font-size:11px;color:#64748b;font-weight:600;">Due Date
            <input type="date" id="mdm-due" value="${state.dueDate}" style="margin-left:4px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;">
          </label>
          <button id="mdm-close" style="background:none;border:none;font-size:24px;color:#94a3b8;cursor:pointer;line-height:1;">×</button>
        </div>
      </div>

      <!-- Body -->
      <div style="flex:1;overflow-y:auto;padding:20px 24px;">

        <!-- Client + Addresses -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
          <!-- Bill To -->
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px;">
            <div style="font-size:10px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Bill To</div>
            ${['name|Name', 'company|Company', 'email|Email', 'addr1|Address Line 1', 'addr2|Address Line 2', 'city|City', 'state|State', 'postcode|Postcode', 'phone|Phone'].map(f => {
              const [k, l] = f.split('|');
              return `<input data-bill="${k}" placeholder="${l}" value="${state.customer[k]||''}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;margin-bottom:4px;font-family:inherit;box-sizing:border-box;">`;
            }).join('')}
          </div>
          <!-- Ship To -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Ship To</div>
              <label style="font-size:11px;color:#64748b;cursor:pointer;display:flex;align-items:center;gap:4px;">
                <input type="checkbox" id="mdm-ship-same" ${state.shipSameAsBill ? 'checked' : ''}> Same as billing
              </label>
            </div>
            <div id="mdm-ship-fields" style="display:${state.shipSameAsBill ? 'none' : 'block'};">
              ${['name|Name', 'company|Company', 'addr1|Address Line 1', 'addr2|Address Line 2', 'city|City', 'state|State', 'postcode|Postcode', 'phone|Phone'].map(f => {
                const [k, l] = f.split('|');
                return `<input data-ship="${k}" placeholder="${l}" value="${state.shipTo[k]||''}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;margin-bottom:4px;font-family:inherit;box-sizing:border-box;">`;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Project Name -->
        <div style="margin-bottom:16px;">
          <input id="mdm-project" placeholder="Project Name" value="${state.projectName}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-weight:600;font-family:inherit;box-sizing:border-box;">
        </div>

        <!-- Line Items -->
        <div style="font-size:10px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Line Items</div>
        <div id="mdm-lines">
          ${state.lineItems.map((li, i) => lineItemRow(li, i)).join('')}
        </div>
        <button id="mdm-add-line" style="margin-top:8px;padding:8px 16px;background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:8px;font-size:12px;font-weight:600;color:#475569;cursor:pointer;font-family:inherit;width:100%;transition:0.2s;">+ Add Line Item</button>

        <!-- Totals -->
        <div style="margin-top:16px;display:flex;justify-content:flex-end;">
          <div style="width:280px;">
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#475569;margin-bottom:6px;">
              <span>Subtotal</span><span style="font-weight:700;color:#0f172a;">US$${fmt(subtotal)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#475569;margin-bottom:6px;">
              <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
                <input type="checkbox" id="mdm-gst" ${state.includeGst ? 'checked' : ''}> GST (10%)
              </label>
              <span style="font-weight:700;color:#0f172a;">US$${fmt(gst)}</span>
            </div>
            <div style="border-top:2px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between;font-size:16px;font-weight:800;color:#15803d;">
              <span>Total</span><span>US$${fmt(total)}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div style="margin-top:16px;">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Notes / Terms</div>
          <textarea id="mdm-notes" rows="5" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;font-family:inherit;resize:vertical;box-sizing:border-box;">${state.notes}</textarea>
        </div>
      </div>

      <!-- Footer Actions -->
      <div style="padding:14px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">
        <button id="mdm-download" style="padding:10px 20px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;color:#475569;">⬇ Download PDF</button>
        <button id="mdm-save" style="padding:10px 20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(59,130,246,0.3);">☁ Save to OneDrive</button>
      </div>
    </div>`;

    // Bind events
    overlay.querySelector('#mdm-close').onclick = () => overlay.remove();
    overlay.querySelector('#mdm-date').onchange = e => { state.date = e.target.value; };
    overlay.querySelector('#mdm-due').onchange = e => { state.dueDate = e.target.value; };
    overlay.querySelector('#mdm-project').onchange = e => { state.projectName = e.target.value; };
    overlay.querySelector('#mdm-notes').onchange = e => { state.notes = e.target.value; };
    overlay.querySelector('#mdm-gst').onchange = e => { state.includeGst = e.target.checked; render(); };
    overlay.querySelector('#mdm-ship-same').onchange = e => {
      state.shipSameAsBill = e.target.checked;
      overlay.querySelector('#mdm-ship-fields').style.display = e.target.checked ? 'none' : 'block';
    };

    // Bill-to fields
    overlay.querySelectorAll('[data-bill]').forEach(inp => {
      inp.onchange = () => { state.customer[inp.dataset.bill] = inp.value; };
    });
    // Ship-to fields
    overlay.querySelectorAll('[data-ship]').forEach(inp => {
      inp.onchange = () => { state.shipTo[inp.dataset.ship] = inp.value; };
    });

    // Line item events
    bindLineItemEvents();

    overlay.querySelector('#mdm-add-line').onclick = () => {
      state.lineItems.push({ description: '', details: '', qty: 1, unitPrice: 0, thumbnail: null });
      render();
    };

    overlay.querySelector('#mdm-download').onclick = () => generateAndAct('download');
    overlay.querySelector('#mdm-save').onclick = () => generateAndAct('save');

    // Close on backdrop click
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  }

  function lineItemRow(li, i) {
    const thumbPreview = li.thumbnail
      ? `<img src="${li.thumbnail}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;">`
      : `<div style="width:48px;height:48px;background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;color:#94a3b8;cursor:pointer;" title="Drop image">📷</div>`;

    return `
    <div class="mdm-line" data-idx="${i}" style="display:flex;gap:10px;align-items:flex-start;padding:10px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;">
      <div class="mdm-thumb-drop" data-idx="${i}" style="flex-shrink:0;cursor:pointer;">${thumbPreview}</div>
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <input data-li="description" placeholder="Description" value="${li.description}" style="grid-column:1/-1;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;">
        <input data-li="details" placeholder="Details / specs" value="${li.details}" style="grid-column:1/-1;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;">
        <input data-li="qty" type="number" min="1" placeholder="Qty" value="${li.qty}" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;text-align:center;">
        <input data-li="unitPrice" type="number" step="0.01" placeholder="Unit Price" value="${li.unitPrice||''}" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;text-align:right;">
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;min-width:80px;">
        <div style="font-size:13px;font-weight:700;color:#15803d;white-space:nowrap;">US$${fmt((Number(li.qty)||0)*(Number(li.unitPrice)||0))}</div>
        <button class="mdm-remove-line" data-idx="${i}" style="padding:4px 8px;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;font-size:10px;font-weight:600;color:#dc2626;cursor:pointer;font-family:inherit;"${state.lineItems.length <= 1 ? ' disabled' : ''}>✕</button>
      </div>
    </div>`;
  }

  function bindLineItemEvents() {
    overlay.querySelectorAll('.mdm-line').forEach(row => {
      const idx = parseInt(row.dataset.idx);
      row.querySelectorAll('[data-li]').forEach(inp => {
        inp.onchange = () => {
          const k = inp.dataset.li;
          state.lineItems[idx][k] = (k === 'qty' || k === 'unitPrice') ? Number(inp.value) : inp.value;
          // Update line total display
          const totalEl = row.querySelector('div[style*="font-weight:700"]');
          if (totalEl) totalEl.textContent = `US$${fmt((Number(state.lineItems[idx].qty)||0)*(Number(state.lineItems[idx].unitPrice)||0))}`;
        };
      });
    });

    // Remove line
    overlay.querySelectorAll('.mdm-remove-line').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        if (state.lineItems.length > 1) { state.lineItems.splice(idx, 1); render(); }
      };
    });

    // Thumbnail drag-drop
    overlay.querySelectorAll('.mdm-thumb-drop').forEach(dropZone => {
      const idx = parseInt(dropZone.dataset.idx);
      dropZone.ondragover = e => { e.preventDefault(); dropZone.style.opacity = '0.6'; };
      dropZone.ondragleave = () => { dropZone.style.opacity = '1'; };
      dropZone.ondrop = e => {
        e.preventDefault(); dropZone.style.opacity = '1';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = ev => { state.lineItems[idx].thumbnail = ev.target.result; render(); };
          reader.readAsDataURL(file);
        }
      };
      dropZone.onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => {
          const file = inp.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = ev => { state.lineItems[idx].thumbnail = ev.target.result; render(); };
            reader.readAsDataURL(file);
          }
        };
        inp.click();
      };
    });
  }

  async function generateAndAct(action) {
    // Sync any unsaved input values
    overlay.querySelectorAll('[data-bill]').forEach(inp => { state.customer[inp.dataset.bill] = inp.value; });
    overlay.querySelectorAll('[data-ship]').forEach(inp => { state.shipTo[inp.dataset.ship] = inp.value; });
    state.projectName = overlay.querySelector('#mdm-project')?.value || state.projectName;
    state.notes = overlay.querySelector('#mdm-notes')?.value || state.notes;
    state.date = overlay.querySelector('#mdm-date')?.value || state.date;

    overlay.querySelectorAll('.mdm-line').forEach(row => {
      const idx = parseInt(row.dataset.idx);
      row.querySelectorAll('[data-li]').forEach(inp => {
        const k = inp.dataset.li;
        state.lineItems[idx][k] = (k === 'qty' || k === 'unitPrice') ? Number(inp.value) : inp.value;
      });
    });

    const subtotal = state.lineItems.reduce((s, li) => s + (Number(li.qty)||0) * (Number(li.unitPrice)||0), 0);
    const gstAmount = state.includeGst ? subtotal * 0.10 : 0;
    const total = subtotal + gstAmount;

    const fmtAddr = a => [a.addr1, a.addr2, [a.city, a.state, a.postcode].filter(Boolean).join(' '), a.phone ? 'Ph: ' + a.phone : ''].filter(Boolean).join(', ');
    const billTo = { ...state.customer, address: fmtAddr(state.customer) };
    const shipTo = state.shipSameAsBill ? { ...billTo } : { ...state.shipTo, address: fmtAddr(state.shipTo) };

    const docData = {
      type: docType, title: cfg.title, prefix: cfg.prefix, docRef: state.docRef,
      date: state.date, rfqId: 'MANUAL', rfqRef: state.docRef, projectName: state.projectName || 'Manual Document',
      customer: billTo, shipTo, shipSameAsBill: state.shipSameAsBill,
      lineItems: state.lineItems.map(li => ({ description: li.description || 'Item', details: li.details, qty: Number(li.qty)||1, unitPrice: Number(li.unitPrice)||0 })),
      subtotal, includeGst: state.includeGst, gstAmount, total,
      notes: state.notes, createdAt: new Date().toISOString(), status: 'sent', sentAt: new Date().toISOString()
    };

    const logoDataUrl = await getLogoBase64();
    const pdf = generatePDF(docData, logoDataUrl);

    if (action === 'download') {
      const fileName = `AtlasDT_${cfg.title.replace(/\s+/g,'_')}_${state.docRef}.pdf`;
      pdf.save(fileName);
    } else if (action === 'save') {
      const btn = overlay.querySelector('#mdm-save');
      btn.disabled = true; btn.textContent = '☁ Uploading…';
      try {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const publicUrl = await uploadAndSyncDoc(pdfBase64, docData);
        btn.textContent = '✓ Saved to OneDrive';
        btn.style.background = '#15803d';
        console.log('[ManualDoc] Saved:', publicUrl);
      } catch (err) {
        console.error('[ManualDoc] Save failed:', err);
        alert('Save failed: ' + err.message);
        btn.disabled = false; btn.textContent = '☁ Save to OneDrive';
      }
    }
  }

  render();
  document.body.appendChild(overlay);
}
