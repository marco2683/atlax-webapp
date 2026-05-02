/* ============================================================
   Document Generator — Quotation / Proforma Invoice / Invoice
   ============================================================
   Opens a modal to compose, preview, save-draft, and send
   professional PDF documents attached to an RFQ.
   ============================================================ */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../utils/supabaseClient.js';

const DOC_TYPES = {
  quotation:  { title: 'Quotation',          prefix: 'QT',  emailSubject: 'Your Quotation from AtlasDT' },
  proforma:   { title: 'Proforma Invoice',   prefix: 'PI',  emailSubject: 'Proforma Invoice from AtlasDT' },
  invoice:    { title: 'Commercial Invoice',  prefix: 'INV', emailSubject: 'Commercial Invoice from AtlasDT' },
};

// ── helpers ─────────────────────────────────────────────────
function fmt(n) { return Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
function uid4() { return Math.random().toString(36).slice(2,6).toUpperCase(); }
function today() { return new Date().toISOString().slice(0,10); }

// Cache the logo as base64 so we only fetch once
let _logoBase64 = null;
async function getLogoBase64() {
  if (_logoBase64) return _logoBase64;
  try {
    const resp = await fetch('/logos/atlasdt-logo-light.png');
    const blob = await resp.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => { _logoBase64 = reader.result; resolve(_logoBase64); };
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ── PUBLIC: open the document generator modal ───────────────
export async function openDocumentGenerator({ docType, rfq, rfqData, profile, rfqs, onComplete }) {
  // Pre-fetch logo
  const logoDataUrl = await getLogoBase64();
  const cfg = DOC_TYPES[docType];
  if (!cfg) return alert('Unknown document type');

  const data  = rfqData || rfq.rfq_data || {};
  const ref   = `ADT-${(rfq.id||'').slice(0,8).toUpperCase()}`;
  const docRef = `${cfg.prefix}-${uid4()}`;
  const parts = data.parts || [];

  // Build initial line items from RFQ parts
  let lineItems = parts.map((p, i) => ({
    _origIdx: i,
    description: p.name || 'Part',
    details: [p.process, p.material].filter(Boolean).join(' · '),
    qty: Number(p.qty) || 1,
    unitPrice: Number(p.price) || 0,
  }));
  if (!lineItems.length) {
    lineItems.push({ description: 'Project Service', details: '', qty: 1, unitPrice: Number(data.total_price) || 0 });
  }

  // Customer info
  const custName    = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '';
  const custEmail   = profile?.email || '';
  const custCompany = profile?.company || '';
  const projectName = data.project_name || 'Unnamed Project';
  const getAddr = (a) => {
    if (!a) return {};
    if (typeof a === 'string') {
      try {
        return JSON.parse(a);
      } catch (e) {
        return { line1: a }; // fallback for legacy plain text addresses
      }
    }
    return a;
  };
  const bAddr = getAddr(profile?.address);
  const sAddr = getAddr(profile?.shipping_address);
  const bPhone = [bAddr.phone_prefix, bAddr.phone].filter(Boolean).join(' ');
  const sPhone = [sAddr.phone_prefix, sAddr.phone].filter(Boolean).join(' ');

  const isShipDifferent = !!sAddr.line1 && sAddr.line1 !== bAddr.line1;

  // ── Build Modal HTML ──────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'doc-gen-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);z-index:10500;display:flex;align-items:center;justify-content:center;padding:16px;';

  overlay.innerHTML = `
    <div id="doc-gen-modal" style="background:#fff;border-radius:16px;width:880px;max-width:96vw;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 64px rgba(0,0,0,0.35);font-family:Inter,sans-serif;">

      <!-- Header -->
      <div style="padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;background:#f8fafc;">
        <div>
          <div style="font-size:10px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px;">Generate ${cfg.title}</div>
          <h2 style="margin:0;font-size:18px;color:#0f172a;font-weight:700;">${projectName} <span style="font-size:13px;color:#94a3b8;font-weight:500;">· ${ref}</span></h2>
        </div>
        <button id="doc-gen-close" style="background:none;border:none;font-size:24px;cursor:pointer;color:#94a3b8;padding:4px 8px;">&times;</button>
      </div>

      <!-- Body (scrollable) -->
      <div style="flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:20px;">

        <!-- Row 1: Doc Type / Ref / Date -->
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.4px;">Document Type</label>
          <select id="doc-type-select" style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:600;font-family:inherit;background:#fff;">
            <option value="quotation" ${docType==='quotation'?'selected':''}>Quotation</option>
            <option value="proforma"  ${docType==='proforma'?'selected':''}>Proforma Invoice</option>
            <option value="invoice"   ${docType==='invoice'?'selected':''}>Commercial Invoice</option>
          </select>
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
            <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Doc Ref</label>
            <input id="doc-ref" value="${docRef}" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:700;font-family:'SF Mono',monospace;width:110px;background:#f8fafc;text-align:center;" />
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Date</label>
            <input id="doc-date" type="date" value="${today()}" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;background:#fff;" />
          </div>
        </div>

        <!-- Row 2: GST toggle -->
        <div style="display:flex;align-items:center;gap:12px;">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#475569;cursor:pointer;padding:8px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;user-select:none;">
            <input id="doc-gst-toggle" type="checkbox" style="width:16px;height:16px;cursor:pointer;accent-color:#2563eb;" />
            Include GST (10%) — Australian customers
          </label>
        </div>

        <!-- Bill To & Ship To -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">

          <!-- BILL TO -->
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:14px 18px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <div style="font-size:10px;color:#0369a1;text-transform:uppercase;font-weight:700;letter-spacing:.5px;">Bill To</div>
              <button id="doc-bill-expand" type="button" style="background:none;border:none;color:#0369a1;font-size:11px;font-weight:600;cursor:pointer;text-decoration:underline;">Show full address ▾</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div><label style="font-size:10px;color:#64748b;font-weight:600;">Name</label><input id="doc-bill-name" value="${custName}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
              <div><label style="font-size:10px;color:#64748b;font-weight:600;">Company</label><input id="doc-bill-company" value="${custCompany}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
              <div style="grid-column:1/-1;"><label style="font-size:10px;color:#64748b;font-weight:600;">Email</label><input id="doc-bill-email" value="${custEmail}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
            </div>
            <div id="doc-bill-full" style="display:none;margin-top:8px;">
              <div style="display:grid;grid-template-columns:1fr;gap:6px;">
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">Address Line 1</label><input id="doc-bill-addr1" value="${bAddr.line1 || ''}" placeholder="Street address" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">Address Line 2</label><input id="doc-bill-addr2" value="${bAddr.line2 || ''}" placeholder="Suite, unit, etc." style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">City</label><input id="doc-bill-city" value="${bAddr.city || ''}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">State / Province</label><input id="doc-bill-state" value="${bAddr.state || ''}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">Postcode</label><input id="doc-bill-postcode" value="${bAddr.postcode || ''}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">Phone</label><input id="doc-bill-phone" value="${bPhone}" placeholder="Optional" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
              </div>
            </div>
          </div>

          <!-- SHIP TO -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <div style="font-size:10px;color:#475569;text-transform:uppercase;font-weight:700;letter-spacing:.5px;">Ship To</div>
              <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:#64748b;font-weight:600;cursor:pointer;">
                <input id="doc-ship-same" type="checkbox" ${!isShipDifferent ? 'checked' : ''} style="cursor:pointer;accent-color:#2563eb;" /> Same as billing
              </label>
            </div>
            <div id="doc-ship-fields" style="display:${isShipDifferent ? 'block' : 'none'};">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">Name</label><input id="doc-ship-name" value="${custName}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">Company</label><input id="doc-ship-company" value="${custCompany}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
              </div>
              <div style="display:grid;grid-template-columns:1fr;gap:6px;margin-top:6px;">
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">Address Line 1</label><input id="doc-ship-addr1" value="${sAddr.line1 || ''}" placeholder="Street address" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">Address Line 2</label><input id="doc-ship-addr2" value="${sAddr.line2 || ''}" placeholder="Suite, unit, etc." style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">City</label><input id="doc-ship-city" value="${sAddr.city || ''}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">State / Province</label><input id="doc-ship-state" value="${sAddr.state || ''}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">Postcode</label><input id="doc-ship-postcode" value="${sAddr.postcode || ''}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
                <div><label style="font-size:10px;color:#64748b;font-weight:600;">Phone</label><input id="doc-ship-phone" value="${sPhone}" placeholder="Optional" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:inherit;margin-top:2px;box-sizing:border-box;" /></div>
              </div>
            </div>
            <div id="doc-ship-same-msg" style="padding:12px 0;color:#94a3b8;font-size:12px;font-style:italic;display:${isShipDifferent ? 'none' : 'block'};">Same as billing address</div>
          </div>
        </div>

        <!-- Line Items Table -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:.5px;">Line Items</div>
            <button id="doc-add-line" style="padding:5px 12px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;">+ Add Line</button>
          </div>
          <div id="doc-lines-container" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;"></div>
          <div id="doc-totals" style="display:flex;flex-direction:column;align-items:flex-end;padding:12px 16px;gap:4px;font-size:13px;color:#0f172a;"></div>
        </div>

        <!-- Notes -->
        <div>
          <label style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:.5px;">Notes / Terms</label>
          <textarea id="doc-notes" rows="6" placeholder="Payment terms, validity, special conditions..." style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;margin-top:4px;resize:vertical;">Payment due within 14 days of issue date.
Prices quoted in USD. All prices are EXW unless otherwise specified.

Bank Transfer Details:
Bank: NAB — National Australia Bank
Account Name: Paniani Products Pty Ltd
BSB: 083-004  |  Account No: 978 360 554
SWIFT / BIC: NATAAU3303</textarea>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;background:#f8fafc;">
        <button id="doc-download-btn" style="padding:8px 18px;background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">⬇ Download PDF</button>
        <button id="doc-save-draft-btn" style="padding:8px 18px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Save Draft</button>
        <button id="doc-send-btn" style="padding:8px 18px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(37,99,235,.3);">Send to Customer</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // ── Close ──
  overlay.querySelector('#doc-gen-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // ── Render line items ──
  const linesContainer = overlay.querySelector('#doc-lines-container');
  const totalsEl       = overlay.querySelector('#doc-totals');

  function updateTotals() {
    const subtotal = lineItems.reduce((s,li) => s + (li.qty * li.unitPrice), 0);
    const gstOn = overlay.querySelector('#doc-gst-toggle')?.checked || false;
    const gstAmt = gstOn ? subtotal * 0.10 : 0;
    const grandTotal = subtotal + gstAmt;
    totalsEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;width:240px;padding:2px 0;"><span style="color:#64748b;font-weight:500;">Subtotal</span><span style="font-weight:600;">$${fmt(subtotal)}</span></div>
      ${gstOn ? `<div style="display:flex;justify-content:space-between;width:240px;padding:2px 0;"><span style="color:#64748b;font-weight:500;">GST (10%)</span><span style="font-weight:600;">$${fmt(gstAmt)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;width:240px;padding:4px 0;border-top:1px solid #e2e8f0;margin-top:2px;"><span style="font-weight:700;">Grand Total</span><span style="font-weight:800;color:#10b981;font-size:15px;">$${fmt(grandTotal)}</span></div>
    `;
  }

  function renderLines() {
    linesContainer.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead style="background:#f8fafc;">
          <tr style="border-bottom:1px solid #e2e8f0;text-align:left;">
            <th style="padding:8px 12px;font-weight:600;color:#475569;width:35%;">Description</th>
            <th style="padding:8px 12px;font-weight:600;color:#475569;">Details</th>
            <th style="padding:8px 12px;font-weight:600;color:#475569;width:60px;text-align:center;">Qty</th>
            <th style="padding:8px 12px;font-weight:600;color:#475569;width:100px;text-align:right;">Unit Price</th>
            <th style="padding:8px 12px;font-weight:600;color:#475569;width:100px;text-align:right;">Line Total</th>
            <th style="padding:8px 12px;width:40px;"></th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.map((li, i) => `
          <tr data-idx="${i}" style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:6px 8px;"><input data-field="description" value="${li.description}" style="width:100%;padding:5px 8px;border:1px solid #e2e8f0;border-radius:5px;font-size:12px;font-family:inherit;" /></td>
            <td style="padding:6px 8px;"><input data-field="details" value="${li.details||''}" style="width:100%;padding:5px 8px;border:1px solid #e2e8f0;border-radius:5px;font-size:12px;font-family:inherit;" /></td>
            <td style="padding:6px 8px;"><input data-field="qty" type="number" min="1" value="${li.qty}" style="width:100%;padding:5px 4px;border:1px solid #e2e8f0;border-radius:5px;font-size:12px;text-align:center;font-family:inherit;" /></td>
            <td style="padding:6px 8px;"><input data-field="unitPrice" type="number" step="0.01" min="0" value="${li.unitPrice}" style="width:100%;padding:5px 8px;border:1px solid #e2e8f0;border-radius:5px;font-size:12px;text-align:right;font-family:inherit;" /></td>
            <td class="line-total" style="padding:6px 12px;text-align:right;font-weight:600;color:#0f172a;">$${fmt(li.qty * li.unitPrice)}</td>
            <td style="padding:6px 4px;text-align:center;"><button class="doc-remove-line" data-idx="${i}" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px;line-height:1;" title="Remove">&times;</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`;

    updateTotals();

    // Wire inline edits without re-rendering to preserve focus
    linesContainer.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => {
        const row = inp.closest('tr');
        const idx = Number(row.dataset.idx);
        const field = inp.dataset.field;
        if (field === 'qty' || field === 'unitPrice') {
          lineItems[idx][field] = Number(inp.value) || 0;
          row.querySelector('.line-total').textContent = '$' + fmt(lineItems[idx].qty * lineItems[idx].unitPrice);
          updateTotals();
        } else {
          lineItems[idx][field] = inp.value;
        }
      });
    });

    // Wire remove buttons
    linesContainer.querySelectorAll('.doc-remove-line').forEach(btn => {
      btn.addEventListener('click', () => {
        lineItems.splice(Number(btn.dataset.idx), 1);
        renderLines();
      });
    });
  }

  renderLines();

  // ── Add line ──
  overlay.querySelector('#doc-add-line').addEventListener('click', () => {
    lineItems.push({ description: '', details: '', qty: 1, unitPrice: 0 });
    renderLines();
    // Focus the new description field
    const inputs = linesContainer.querySelectorAll('input[data-field="description"]');
    inputs[inputs.length - 1]?.focus();
  });

  // ── GST toggle listener ──
  overlay.querySelector('#doc-gst-toggle')?.addEventListener('change', () => renderLines());

  // ── Bill To expand/collapse ──
  const billExpandBtn = overlay.querySelector('#doc-bill-expand');
  const billFullBlock = overlay.querySelector('#doc-bill-full');
  billExpandBtn?.addEventListener('click', () => {
    const showing = billFullBlock.style.display !== 'none';
    billFullBlock.style.display = showing ? 'none' : 'block';
    billExpandBtn.textContent = showing ? 'Show full address ▾' : 'Hide address ▴';
  });

  // ── Ship To same-as-billing toggle ──
  const shipSameCheckbox = overlay.querySelector('#doc-ship-same');
  const shipFields = overlay.querySelector('#doc-ship-fields');
  const shipSameMsg = overlay.querySelector('#doc-ship-same-msg');
  shipSameCheckbox?.addEventListener('change', () => {
    const same = shipSameCheckbox.checked;
    shipFields.style.display = same ? 'none' : 'block';
    shipSameMsg.style.display = same ? 'block' : 'none';
  });

  // ── Helper: read address block ──
  function readAddress(prefix) {
    const v = id => (overlay.querySelector('#' + id)?.value || '').trim();
    return {
      name: v(`doc-${prefix}-name`),
      company: v(`doc-${prefix}-company`),
      email: v(`doc-${prefix}-email`) || '',
      addr1: v(`doc-${prefix}-addr1`),
      addr2: v(`doc-${prefix}-addr2`),
      city: v(`doc-${prefix}-city`),
      state: v(`doc-${prefix}-state`),
      postcode: v(`doc-${prefix}-postcode`),
      phone: v(`doc-${prefix}-phone`),
    };
  }
  function fmtAddr(a) {
    return [a.addr1, a.addr2, [a.city, a.state, a.postcode].filter(Boolean).join(' '), a.phone ? `Ph: ${a.phone}` : ''].filter(Boolean).join(', ');
  }

  // ── Collect doc data helper ──
  function collectDocData() {
    const selType = overlay.querySelector('#doc-type-select').value;
    const selCfg = DOC_TYPES[selType];
    const subtotal = lineItems.reduce((s,li) => s + (li.qty * li.unitPrice), 0);
    const includeGst = overlay.querySelector('#doc-gst-toggle')?.checked || false;
    const gstAmount = includeGst ? subtotal * 0.10 : 0;
    const billTo = readAddress('bill');
    const shipSame = overlay.querySelector('#doc-ship-same')?.checked ?? true;
    const shipTo = shipSame ? { ...billTo } : readAddress('ship');
    return {
      type: selType,
      title: selCfg.title,
      prefix: selCfg.prefix,
      docRef: overlay.querySelector('#doc-ref').value,
      date: overlay.querySelector('#doc-date').value,
      rfqId: rfq.id,
      rfqRef: ref,
      projectName,
      customer: { ...billTo, address: fmtAddr(billTo) },
      shipTo: { ...shipTo, address: fmtAddr(shipTo) },
      shipSameAsBill: shipSame,
      lineItems: lineItems.map(li => ({ ...li })),
      subtotal,
      includeGst,
      gstAmount,
      total: subtotal + gstAmount,
      notes: overlay.querySelector('#doc-notes').value,
      createdAt: new Date().toISOString(),
    };
  }

  // ── Generate PDF ──
  function generatePDF(docData) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 18;

    // ─── Header bar (lighter blue) ───
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pw, 32, 'F');

    // Teal accent stripe
    doc.setFillColor(20, 184, 166);
    doc.rect(0, 32, pw, 1.2, 'F');

    // Logo (embedded image)
    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, 'PNG', margin, 6, 34, 11); } catch (_) {}
    }
    doc.setTextColor(180, 200, 220);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('info@atlasdt.com  ·  www.atlasdt.com', margin, 25);
    doc.text('Shenzhen  ·  Melbourne  ·  Carlsbad, CA', margin, 29);

    // Doc title — right side of header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(docData.title.toUpperCase(), pw - margin, 13, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(docData.docRef, pw - margin, 20, { align: 'right' });
    doc.setFontSize(9);
    doc.setTextColor(180, 200, 220);
    doc.text(`Date: ${docData.date}`, pw - margin, 26, { align: 'right' });

    let y = 42;

    // ─── FROM / BILL TO / SHIP TO ───
    const colGap = 5;
    const col3W = (pw - margin * 2 - colGap * 2) / 3;

    // Helper: build address lines array
    function addrLines(a) {
      return [a.name, a.company, a.addr1, a.addr2, [a.city, a.state, a.postcode].filter(Boolean).join(' '), a.email, a.phone ? `Ph: ${a.phone}` : ''].filter(Boolean);
    }

    const billLines = addrLines(docData.customer);
    const shipLines = docData.shipSameAsBill ? ['Same as billing'] : addrLines(docData.shipTo);
    const maxLines = Math.max(6, billLines.length, shipLines.length);
    const boxH = 10 + maxLines * 4;

    // FROM
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, col3W, boxH, 2, 2, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM', margin + 4, y + 6);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Atlas Design & Technology', margin + 4, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Cnr Carrington Rd & Thurston St', margin + 4, y + 16);
    doc.text('Suite 10/1 Main St, Box Hill', margin + 4, y + 20);
    doc.text('VIC 3128, Australia', margin + 4, y + 24);
    doc.text('info@atlasdt.com', margin + 4, y + 28);

    // BILL TO
    const billX = margin + col3W + colGap;
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(billX, y, col3W, boxH, 2, 2, 'F');
    doc.setTextColor(3, 105, 161);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', billX + 4, y + 6);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(billLines[0] || '—', billX + 4, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    billLines.slice(1).forEach((line, i) => doc.text(line, billX + 4, y + 16 + i * 4));

    // SHIP TO
    const shipX = margin + (col3W + colGap) * 2;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(shipX, y, col3W, boxH, 2, 2, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIP TO', shipX + 4, y + 6);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(shipLines[0] || '—', shipX + 4, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    shipLines.slice(1).forEach((line, i) => doc.text(line, shipX + 4, y + 16 + i * 4));

    y += boxH + 6;

    // ─── Project ref bar ───
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, pw - margin * 2, 10, 2, 2, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Project: ${docData.projectName}`, margin + 5, y + 6.5);
    doc.text(`RFQ Ref: ${docData.rfqRef}`, pw - margin - 5, y + 6.5, { align: 'right' });
    y += 16;

    // ─── Line items table ───
    const tableBody = docData.lineItems.map(li => [
      li.description + (li.details ? `\n${li.details}` : ''),
      li.qty.toString(),
      `$${fmt(li.unitPrice)}`,
      `$${fmt(li.qty * li.unitPrice)}`,
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Description', 'Qty', 'Unit Price', 'Line Total']],
      body: tableBody,
      styles: { fontSize: 9, cellPadding: 4, font: 'helvetica', textColor: [15, 23, 42], lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 32 },
        3: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    y = (doc.lastAutoTable?.finalY ?? doc.previousAutoTable?.finalY ?? y + 40) + 8;

    // ─── Totals block (right-aligned) ───
    const totalW = 80;
    const tx = pw - margin - totalW;

    // Subtotal
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal', tx, y + 5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${fmt(docData.subtotal)}`, pw - margin, y + 5, { align: 'right' });
    y += 6;

    // GST row (if applicable)
    if (docData.includeGst) {
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text('GST (10%)', tx, y + 5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${fmt(docData.gstAmount)}`, pw - margin, y + 5, { align: 'right' });
      y += 6;
    }

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(tx, y + 2, pw - margin, y + 2);
    y += 5;

    // Grand Total
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(tx - 4, y, totalW + 4, 12, 2, 2, 'FD');
    doc.setTextColor(21, 128, 61);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`GRAND TOTAL  $${fmt(docData.total)}`, pw - margin - 4, y + 8, { align: 'right' });
    y += 22;

    // ─── Notes / Terms ───
    if (docData.notes) {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES / TERMS', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const noteLines = doc.splitTextToSize(docData.notes, pw - margin * 2);
      doc.setTextColor(71, 85, 105);
      doc.text(noteLines, margin, y);
    }

    // ─── Footer ───
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, ph - 22, pw - margin, ph - 22);
    // Teal mini-stripe
    doc.setFillColor(20, 184, 166);
    doc.rect(margin, ph - 21.5, pw - margin * 2, 0.5, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(6.5);
    doc.text('PANIANI PRODUCTS PTY LTD  ·  ACN 682 684 386  ·  ABN 23 715 545 472', pw / 2, ph - 17, { align: 'center' });
    doc.text('Level 2, 351 Burwood Highway, Forest Hill, VIC 3131, Australia  ·  atlasdt.com', pw / 2, ph - 13, { align: 'center' });
    doc.text('This is a computer-generated document. No signature required.', pw / 2, ph - 9, { align: 'center' });

    return doc;
  }

  // ── Sync Helper ──
  const uploadAndSyncDoc = async (pdfBase64, docData) => {
    const ts = Date.now();
    const fileName = `${docData.title.replace(/\s+/g,'_')}_${docData.docRef}_${today()}_${ts}.pdf`;
    const cleanFileName = `${docData.title.replace(/\s+/g,'_')}_${docData.docRef}_${today()}.pdf`;
    const storagePath = `documents/${docData.rfqRef}/${fileName}`;
    
    console.log('[DocGen] Uploading PDF to Supabase...', { storagePath, bucket: 'rfq-docs' });
    
    // Use Netlify function to bypass RLS
    const uploadRes = await fetch('/.netlify/functions/storage-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64: pdfBase64,
        fileName: fileName,
        filePath: storagePath,
        contentType: 'application/pdf',
        bucket: 'rfq-docs'
      })
    });

    if (!uploadRes.ok) {
      const errTxt = await uploadRes.text();
      console.error('[DocGen] Supabase upload HTTP error:', uploadRes.status, errTxt);
      throw new Error(`Storage upload failed: ${uploadRes.statusText}`);
    }

    const uploadData = await uploadRes.json();
    console.log('[DocGen] Supabase upload response:', uploadData);
    if (!uploadData.success) {
      throw new Error(`Storage upload failed: ${uploadData.error || 'Unknown error'}`);
    }

    if (uploadData.publicUrl) {
      // Sync to OneDrive via webhook
      const folderIdentifier = docData.customer.company || docData.customer.name;
      const companySuffix = folderIdentifier ? ` - ${folderIdentifier.replace(/[\/\\?%*:|"<>]/g, '')}` : '';
      const webhookPayload = {
        file_name: cleanFileName,
        file_url: uploadData.publicUrl,
        folder_path: `RFQs/${docData.rfqRef}${companySuffix}`,
        metadata: { rfqRef: docData.rfqRef, type: docData.type }
      };
      console.log('[DocGen] Sending to SharePoint webhook:', webhookPayload);
      const spRes = await fetch('/.netlify/functions/webhook-sharepoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });
      const spBody = await spRes.json().catch(() => ({}));
      console.log('[DocGen] SharePoint webhook response:', spRes.status, spBody);
      if (!spRes.ok) {
        throw new Error('SharePoint webhook failed: ' + spRes.statusText);
      }
    } else {
      throw new Error('Could not get public URL for document');
    }
  };

  // ── Sync Helper for Parts ──
  function getSyncedParts() {
    return lineItems.map(li => {
      let basePart = li._origIdx !== undefined ? (data.parts || data.items || [])[li._origIdx] : {};
      const descParts = li.description.split(' - ');
      const name = descParts[0]?.trim() || li.description;
      const material = descParts.slice(1).join(' - ').trim() || '';
      
      const detParts = (li.details || '').split(' · ');
      const process = detParts[0]?.trim() || li.details;
      const finish = detParts.slice(1).join(' · ').trim() || '';
      
      return {
        ...basePart,
        name: name,
        material: material,
        process: process,
        finish: finish,
        qty: li.qty,
        price: li.unitPrice
      };
    });
  }

  // ── Download PDF ──
  overlay.querySelector('#doc-download-btn').addEventListener('click', async () => {
    const docData = collectDocData();
    const pdf = generatePDF(docData);
    const fileName = `AtlasDT_${docData.title.replace(/\s+/g,'_')}_${docData.docRef}_${docData.projectName.replace(/[^a-zA-Z0-9]/g,'_')}.pdf`;
    pdf.save(fileName);
    try {
      await uploadAndSyncDoc(pdf.output('datauristring').split(',')[1], docData);
      console.log('[DocGen] ✅ PDF uploaded and synced to SharePoint successfully');
    } catch (err) {
      console.error('[DocGen] ❌ Upload/sync failed:', err);
    }
  });

  // ── Save Draft ──
  overlay.querySelector('#doc-save-draft-btn').addEventListener('click', async () => {
    const btn = overlay.querySelector('#doc-save-draft-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const docData = collectDocData();
    docData.status = 'draft';

    // Append to rfq_data.documents[]
    const docs = data.documents || [];
    const existIdx = docs.findIndex(d => d.docRef === docData.docRef);
    if (existIdx >= 0) docs[existIdx] = docData;
    else docs.push(docData);

    const updatedData = { 
      ...data, 
      documents: docs,
      parts: getSyncedParts(),
      admin_final_price: docData.total,
      total_price: docData.total,
      is_amending: false
    };

    try {
      const res = await fetch('/.netlify/functions/admin-rfqs', {
        method: 'PATCH',
        body: JSON.stringify({ id: rfq.id, updates: { rfq_data: updatedData } }),
      });
      if (!res.ok) throw new Error('Failed to save');

      // Update local cache
      Object.assign(data, updatedData); // Keep internal reference up to date!
      rfq.rfq_data = updatedData;
      if (rfqs) {
        const obj = rfqs.find(r => r.id === rfq.id);
        if (obj) obj.rfq_data = updatedData;
      }
      
      // If we are in admin view, refresh the modal to show synced data
      if (window.renderRfqDetailModal) {
        document.getElementById('admin-rfq-detail-modal')?.remove();
        window.renderRfqDetailModal(rfq);
      }

      btn.textContent = 'Saved ✓';
      setTimeout(() => { btn.textContent = 'Save Draft'; btn.disabled = false; }, 2000);
    } catch (err) {
      alert('Error saving draft: ' + err.message);
      btn.textContent = 'Save Draft';
      btn.disabled = false;
    }
  });

  // ── Send to Customer ──
  overlay.querySelector('#doc-send-btn').addEventListener('click', async () => {
    const btn = overlay.querySelector('#doc-send-btn');
    btn.disabled = true;
    btn.textContent = 'Generating PDF…';
    
    try {
      const docData = collectDocData();
      const customerEmail = docData.customer.email;
      if (!customerEmail) { alert('Please enter the customer email.'); btn.disabled = false; return; }
      
      docData.status = 'sent';
      docData.sentAt = new Date().toISOString();

      // Append to rfq_data.documents[]
      const docs = data.documents || [];
      const existIdx = docs.findIndex(d => d.docRef === docData.docRef);
      if (existIdx >= 0) docs[existIdx] = docData;
      else docs.push(docData);

      const updatedData = { 
        ...data, 
        documents: docs,
        parts: getSyncedParts(),
        admin_final_price: docData.total,
        total_price: docData.total,
        is_amending: false
      };

      // 1. Generate PDF as base64
      const pdf = generatePDF(docData);
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      const fileName = `AtlasDT_${docData.title.replace(/\s+/g,'_')}_${docData.docRef}_${docData.projectName.replace(/[^a-zA-Z0-9]/g,'_')}.pdf`;

      // 2. Save DB changes
      await fetch('/.netlify/functions/admin-rfqs', {
        method: 'PATCH',
        body: JSON.stringify({ id: rfq.id, updates: { rfq_data: updatedData } }),
      });
      Object.assign(data, updatedData); // Keep internal reference up to date!
      rfq.rfq_data = updatedData;
      if (rfqs) { const obj = rfqs.find(r => r.id === rfq.id); if (obj) obj.rfq_data = updatedData; }
      
      // Refresh admin view optimistically
      if (window.renderRfqDetailModal) {
        document.getElementById('admin-rfq-detail-modal')?.remove();
        window.renderRfqDetailModal(rfq);
      }

      btn.textContent = 'Sending email…';

      // 3. Send email with PDF attachment via Netlify function
      const selCfg = DOC_TYPES[docData.type];
      const emailRes = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rfq_document',
          email: customerEmail,
          name: docData.customer.name,
          projectName: docData.projectName,
          docTitle: docData.title,
          docRef: docData.docRef,
          rfqRef: docData.rfqRef,
          total: docData.total,
          pdfBase64,
          pdfFileName: fileName,
        }),
      });
      if (!emailRes.ok) throw new Error('Email delivery failed');

      btn.innerHTML = '&#10003; Saved & Sent';
      btn.style.background = '#64748b';
      
      // Also upload and sync to SharePoint
      await uploadAndSyncDoc(pdfBase64, docData);

      setTimeout(() => { 
        document.body.removeChild(overlay); 
        if (onComplete) onComplete();
      }, 1500);
    } catch (err) {
      alert('Failed to send document: ' + err.message);
      btn.textContent = 'Send to Customer';
      btn.disabled = false;
    }
  });
}
