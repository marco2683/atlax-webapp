import { jsPDF } from 'jspdf';
import { getLogoBase64, uploadAndSyncDoc } from './headless-docs.js';

function uid4() { return Math.random().toString(36).slice(2,6).toUpperCase(); }
function today() { return new Date().toISOString().slice(0,10); }
function fmt(n) { return Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

/**
 * Opens the Project Proposal Wizard modal.
 * Multi-step form to collect Project Info, Scope & Chapters, and Terms,
 * then generates a branded PDF and syncs to OneDrive.
 */
export function openProposalWizard() {
  const state = {
    step: 1,
    docRef: `PRP-${uid4()}`,
    date: today(),
    projectName: '',
    customer: { name: '', company: '', email: '' },
    chapters: [
      { id: uid4(), title: '1. Executive Summary', content: 'Provide a brief overview of the project objectives and expected outcomes.' },
      { id: uid4(), title: '2. Scope of Work', content: 'Detail the specific tasks, deliverables, and phases involved in the project.' },
      { id: uid4(), title: '3. Technical Approach', content: 'Explain the methodologies, technologies, and tools that will be utilized.' }
    ],
    pricing: 0,
    timeline: '4 - 6 Weeks',
    notes: 'Payment schedule: 50% upfront, 50% upon completion.\nPrices quoted in USD. All prices are EXW unless otherwise specified.\n\nBank Transfer Details:\nBank: NAB — National Australia Bank\nAccount Name: Paniani Products Pty Ltd\nBSB: 083-004  |  Account No: 978 360 554\nSWIFT / BIC: NATAAU3303',
  };

  const overlay = document.createElement('div');
  overlay.id = 'proposal-wizard-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;';

  function render() {
    let bodyHtml = '';

    if (state.step === 1) {
      bodyHtml = `
        <div style="padding:24px;">
          <h2 style="font-size:20px;color:#0f172a;margin-top:0;margin-bottom:6px;">Project Information</h2>
          <p style="font-size:13px;color:#64748b;margin-bottom:20px;">Define the core details for this development agreement.</p>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
            <div style="grid-column: 1 / -1;">
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Project Name</label>
              <input id="pw-project" placeholder="e.g. Next-Gen Wearable Enclosure" value="${state.projectName}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;margin-top:6px;box-sizing:border-box;">
            </div>
            
            <div>
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Proposal Date</label>
              <input id="pw-date" type="date" value="${state.date}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;margin-top:6px;box-sizing:border-box;">
            </div>
            
            <div>
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Client Company</label>
              <input id="pw-ccomp" placeholder="Company Name" value="${state.customer.company}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;margin-top:6px;box-sizing:border-box;">
            </div>

            <div>
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Client Contact Name</label>
              <input id="pw-cname" placeholder="Full Name" value="${state.customer.name}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;margin-top:6px;box-sizing:border-box;">
            </div>

            <div>
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Client Email</label>
              <input id="pw-cemail" type="email" placeholder="Email Address" value="${state.customer.email}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;margin-top:6px;box-sizing:border-box;">
            </div>
          </div>
        </div>
      `;
    } else if (state.step === 2) {
      bodyHtml = `
        <div style="padding:24px;display:flex;flex-direction:column;height:100%;box-sizing:border-box;">
          <h2 style="font-size:20px;color:#0f172a;margin-top:0;margin-bottom:6px;">Scope & Chapters</h2>
          <p style="font-size:13px;color:#64748b;margin-bottom:20px;">Outline the structural sections of the proposal. You can add or remove chapters as needed.</p>
          
          <div id="pw-chapters-container" style="flex:1;overflow-y:auto;padding-right:8px;margin-bottom:16px;">
            ${state.chapters.map((ch, i) => `
              <div style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:10px;padding:16px;background:#f8fafc;box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                  <input class="pw-ch-title" data-idx="${i}" value="${ch.title}" placeholder="Chapter Title" style="flex:1;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;font-weight:600;color:#0f172a;font-family:inherit;">
                  <button class="pw-ch-del" data-idx="${i}" style="margin-left:12px;padding:6px 10px;color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:0.2s;">✕ Remove</button>
                </div>
                <textarea class="pw-ch-content" data-idx="${i}" rows="4" placeholder="Chapter content..." style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;color:#334155;font-family:inherit;resize:vertical;box-sizing:border-box;">${ch.content}</textarea>
              </div>
            `).join('')}
          </div>
          
          <button id="pw-add-chapter" style="padding:10px 16px;background:#eff6ff;color:#2563eb;border:2px dashed #bfdbfe;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;width:100%;font-family:inherit;transition:0.2s;">+ Add New Chapter</button>
        </div>
      `;
    } else if (state.step === 3) {
      bodyHtml = `
        <div style="padding:24px;">
          <h2 style="font-size:20px;color:#0f172a;margin-top:0;margin-bottom:6px;">Terms & Pricing</h2>
          <p style="font-size:13px;color:#64748b;margin-bottom:20px;">Finalize the financial terms, timeline, and any additional conditions.</p>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Total Project Cost (USD)</label>
              <div style="position:relative;margin-top:6px;">
                <span style="position:absolute;left:14px;top:10px;font-size:14px;color:#64748b;font-weight:600;">$</span>
                <input id="pw-pricing" type="number" step="0.01" min="0" placeholder="0.00" value="${state.pricing || ''}" style="width:100%;padding:10px 14px 10px 30px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-weight:600;font-family:inherit;box-sizing:border-box;">
              </div>
            </div>
            
            <div>
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Estimated Timeline</label>
              <input id="pw-timeline" placeholder="e.g. 8 - 10 Weeks" value="${state.timeline}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;margin-top:6px;box-sizing:border-box;">
            </div>
            
            <div style="grid-column: 1 / -1;">
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Terms & Conditions</label>
              <textarea id="pw-notes" rows="6" style="width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;margin-top:6px;resize:vertical;box-sizing:border-box;">${state.notes}</textarea>
            </div>
          </div>
        </div>
      `;
    } else if (state.step === 4) {
      bodyHtml = `
        <div style="padding:24px;display:flex;flex-direction:column;align-items:center;text-align:center;">
          <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:28px;">📄</span>
          </div>
          <h2 style="font-size:22px;color:#0f172a;margin-top:0;margin-bottom:8px;">Proposal Ready to Generate</h2>
          <p style="font-size:14px;color:#475569;max-width:400px;line-height:1.5;">You are about to generate the official project proposal PDF for <strong>${state.projectName || 'Unnamed Project'}</strong>.</p>
          
          <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:20px;border-radius:12px;margin-top:24px;width:100%;max-width:480px;text-align:left;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
              <div style="color:#64748b;">Reference:</div><div style="font-weight:600;color:#0f172a;text-align:right;">${state.docRef}</div>
              <div style="color:#64748b;">Client:</div><div style="font-weight:600;color:#0f172a;text-align:right;">${state.customer.company || state.customer.name || '—'}</div>
              <div style="color:#64748b;">Total Price:</div><div style="font-weight:700;color:#15803d;text-align:right;">US$${fmt(state.pricing)}</div>
              <div style="color:#64748b;">Chapters Included:</div><div style="font-weight:600;color:#0f172a;text-align:right;">${state.chapters.length}</div>
            </div>
          </div>
        </div>
      `;
    }

    // Wrap steps logic
    const stepIndicators = [1, 2, 3, 4].map(s => {
      const active = s === state.step;
      const completed = s < state.step;
      const bg = active ? '#2563eb' : (completed ? '#10b981' : '#e2e8f0');
      const fg = (active || completed) ? '#fff' : '#64748b';
      return `<div style="width:28px;height:28px;border-radius:50%;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${completed ? '✓' : s}</div>`;
    }).join('<div style="height:2px;flex:1;background:#e2e8f0;margin:0 8px;"></div>');

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:860px;max-width:95vw;height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.4);">
        
        <!-- Header -->
        <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
          <div>
            <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">AtlasDT</div>
            <div style="font-size:18px;font-weight:800;color:#0f172a;">Project Proposal Wizard</div>
          </div>
          <div style="display:flex;align-items:center;width:240px;">
            ${stepIndicators}
          </div>
          <button id="pw-close" style="background:none;border:none;font-size:28px;color:#94a3b8;cursor:pointer;line-height:1;padding:0 8px;">&times;</button>
        </div>
        
        <!-- Body -->
        <div style="flex:1;overflow-y:auto;position:relative;">
          ${bodyHtml}
        </div>

        <!-- Footer -->
        <div style="padding:16px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
          <button id="pw-prev" style="padding:10px 20px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;color:#475569;transition:0.2s;visibility:${state.step > 1 ? 'visible' : 'hidden'}">← Back</button>
          
          <div style="display:flex; gap:12px;">
            ${state.step === 4 ? `
              <button id="pw-download" style="padding:10px 24px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;color:#475569;transition:0.2s;">⬇ Download PDF</button>
              <button id="pw-save" style="padding:10px 24px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.3);transition:0.2s;">☁ Save & Sync to OneDrive</button>
            ` : `
              <button id="pw-next" style="padding:10px 24px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(15,23,42,0.2);transition:0.2s;">Continue →</button>
            `}
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function saveCurrentStepData() {
    if (state.step === 1) {
      state.projectName = overlay.querySelector('#pw-project')?.value || state.projectName;
      state.date = overlay.querySelector('#pw-date')?.value || state.date;
      state.customer.company = overlay.querySelector('#pw-ccomp')?.value || state.customer.company;
      state.customer.name = overlay.querySelector('#pw-cname')?.value || state.customer.name;
      state.customer.email = overlay.querySelector('#pw-cemail')?.value || state.customer.email;
    } else if (state.step === 2) {
      overlay.querySelectorAll('.pw-ch-title').forEach(inp => {
        state.chapters[inp.dataset.idx].title = inp.value;
      });
      overlay.querySelectorAll('.pw-ch-content').forEach(inp => {
        state.chapters[inp.dataset.idx].content = inp.value;
      });
    } else if (state.step === 3) {
      state.pricing = overlay.querySelector('#pw-pricing')?.value || state.pricing;
      state.timeline = overlay.querySelector('#pw-timeline')?.value || state.timeline;
      state.notes = overlay.querySelector('#pw-notes')?.value || state.notes;
    }
  }

  function bindEvents() {
    overlay.querySelector('#pw-close').onclick = () => overlay.remove();
    
    // Auto-save on change for current step to preserve state if they click outside inputs
    if (state.step === 1) {
      overlay.querySelector('#pw-project').onchange = saveCurrentStepData;
      overlay.querySelector('#pw-date').onchange = saveCurrentStepData;
      overlay.querySelector('#pw-ccomp').onchange = saveCurrentStepData;
      overlay.querySelector('#pw-cname').onchange = saveCurrentStepData;
      overlay.querySelector('#pw-cemail').onchange = saveCurrentStepData;
    }

    if (state.step === 2) {
      overlay.querySelectorAll('.pw-ch-del').forEach(btn => {
        btn.onclick = e => { 
          saveCurrentStepData(); 
          state.chapters.splice(e.target.dataset.idx, 1); 
          render(); 
        };
      });
      overlay.querySelector('#pw-add-chapter').onclick = () => {
        saveCurrentStepData();
        state.chapters.push({ id: uid4(), title: 'New Chapter', content: '' });
        render();
      };
    }

    const prevBtn = overlay.querySelector('#pw-prev');
    if (prevBtn) prevBtn.onclick = () => {
      saveCurrentStepData();
      if (state.step > 1) { state.step--; render(); } 
    };

    const nextBtn = overlay.querySelector('#pw-next');
    if (nextBtn) nextBtn.onclick = () => {
      saveCurrentStepData();
      if (state.step < 4) { state.step++; render(); } 
    };

    const downloadBtn = overlay.querySelector('#pw-download');
    if (downloadBtn) downloadBtn.onclick = () => generateAndAct('download');

    const saveBtn = overlay.querySelector('#pw-save');
    if (saveBtn) saveBtn.onclick = () => generateAndAct('save');
  }

  async function generateAndAct(action) {
    const logoDataUrl = await getLogoBase64();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 20;

    // --- PDF GENERATION LOGIC ---
    // Header Bar
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pw, 32, 'F');
    doc.setFillColor(20, 184, 166);
    doc.rect(0, 32, pw, 1.2, 'F');

    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, 'PNG', margin, 6, 34, 11); } catch (_) {}
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT PROPOSAL', pw - margin, 13, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(state.docRef, pw - margin, 20, { align: 'right' });
    doc.setFontSize(9);
    doc.setTextColor(180, 200, 220);
    doc.text(`Date: ${state.date}`, pw - margin, 26, { align: 'right' });

    let y = 48;

    // Cover Info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(state.projectName || 'Development Agreement', margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const clientStr = [state.customer.name, state.customer.company].filter(Boolean).join(' - ');
    if (clientStr) {
      doc.text(`Prepared for: ${clientStr}`, margin, y);
      y += 8;
    }
    if (state.customer.email) {
      doc.text(`Email: ${state.customer.email}`, margin, y);
      y += 12;
    } else {
      y += 4;
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pw - margin, y);
    y += 12;

    // Chapters
    state.chapters.forEach(ch => {
      // Check page break
      if (y > ph - 40) { 
        doc.addPage(); 
        y = 24; 
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text(ch.title, margin, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      // Handle multiline content wrapping
      const lines = doc.splitTextToSize(ch.content, pw - margin * 2);
      
      // Pre-check if chapter content needs a page break midway
      if (y + (lines.length * 5) > ph - 25) {
        doc.addPage();
        y = 24;
      }
      
      doc.text(lines, margin, y);
      y += (lines.length * 5) + 12;
    });

    // Terms & Pricing (always ensure it fits or breaks page)
    if (y > ph - 60) { doc.addPage(); y = 24; }
    
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pw - margin, y);
    y += 12;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('Commercial Terms & Pricing', margin, y);
    y += 10;

    // Total Cost Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, pw - margin * 2, 24, 2, 2, 'FD');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Estimated Timeline', margin + 8, y + 10);
    doc.text('Total Project Cost', pw - margin - 8, y + 10, { align: 'right' });
    
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(state.timeline || 'TBD', margin + 8, y + 18);
    doc.setTextColor(21, 128, 61); // Green
    doc.text(`US$${fmt(state.pricing)}`, pw - margin - 8, y + 18, { align: 'right' });
    
    y += 34;

    // Notes
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(state.notes, pw - margin * 2);
    doc.text(noteLines, margin, y);

    // Footer setup across all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, ph - 22, pw - margin, ph - 22);
      
      doc.setFillColor(20, 184, 166);
      doc.rect(margin, ph - 21.5, pw - margin * 2, 0.5, 'F');
      
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.text('Atlas Design & Technology', margin, ph - 15);
      doc.text('Confidential & Proprietary', pw - margin, ph - 15, { align: 'right' });
      doc.text(`Page ${i} of ${pageCount}`, pw / 2, ph - 15, { align: 'center' });
    }

    const fileName = `AtlasDT_Proposal_${state.docRef}.pdf`;

    if (action === 'download') {
      doc.save(fileName);
    } else if (action === 'save') {
      const btn = overlay.querySelector('#pw-save');
      if (btn) { btn.disabled = true; btn.textContent = '☁ Uploading...'; }
      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const docData = {
          title: 'Project Proposal',
          prefix: 'PRP',
          docRef: state.docRef,
          projectName: state.projectName || 'Proposal',
          rfqRef: state.docRef, // Uses docRef as rfqRef fallback to create isolated folder
          type: 'proposal',
          customer: { name: state.customer.name, company: state.customer.company }
        };
        const publicUrl = await uploadAndSyncDoc(pdfBase64, docData);
        if (btn) {
          btn.textContent = '✓ Saved to OneDrive';
          btn.style.background = '#15803d';
        }
        console.log('[ProposalWizard] Saved successfully:', publicUrl);
      } catch (err) {
        console.error('[ProposalWizard] Save failed:', err);
        alert('Save failed: ' + err.message);
        if (btn) {
          btn.disabled = false;
          btn.textContent = '☁ Save & Sync to OneDrive';
        }
      }
    }
  }

  // Init
  render();
  document.body.appendChild(overlay);
}
