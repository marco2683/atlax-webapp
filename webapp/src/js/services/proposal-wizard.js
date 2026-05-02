import { getLogoBase64, uploadAndSyncDoc } from './headless-docs.js';
import * as docx from 'docx';

function uid4() { return Math.random().toString(36).slice(2,6).toUpperCase(); }
function today() { return new Date().toISOString().slice(0,10); }
function fmt(n) { return Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

export function openProposalWizard() {
  const state = {
    step: 1,
    docRef: `PRP-${uid4()}`,
    date: today(),
    projectName: '',
    customer: { company: '', logoUrl: null },
    contacts: [{ name: '', email: '' }],
    chapters: [
      { id: uid4(), title: 'Executive Summary', content: 'Provide a brief overview of the project objectives and expected outcomes.' },
      { id: uid4(), title: 'Scope of Work', content: 'Detail the specific tasks, deliverables, and phases involved in the project.' },
      { id: uid4(), title: 'Development Approach', content: 'Explain the methodologies, technologies, and tools that will be utilized.' },
      { id: uid4(), title: 'Schedule', content: 'Project milestones and timeline.\n\n- Phase 1: Planning (Week 1-2)\n- Phase 2: Execution (Week 3-6)\n- Phase 3: Delivery (Week 7)' },
      { id: uid4(), title: 'Assumptions & Qualifications', content: '- Client will provide necessary assets within 5 days of request.\n- Standard SLA applies to support.' }
    ],
    budgetLines: [
      { description: 'Phase 1', details: 'Discovery and Design', amount: 0 }
    ],
    timeline: '4 - 6 Weeks',
    notes: 'Payment schedule: 50% upfront, 50% upon completion.',
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
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Project Name</label>
              <input id="pw-project" placeholder="e.g. Next-Gen Wearable Enclosure" value="${state.projectName}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;margin-top:6px;box-sizing:border-box;">
            </div>
            
            <div>
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Proposal Date</label>
              <input id="pw-date" type="date" value="${state.date}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;margin-top:6px;box-sizing:border-box;">
            </div>
            
            <div>
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Client Company</label>
              <input id="pw-ccomp" placeholder="Company Name" value="${state.customer.company}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;margin-top:6px;box-sizing:border-box;">
            </div>

            <div style="grid-column: 1 / -1;">
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Client Logo (Optional)</label>
              <div style="margin-top:6px;display:flex;align-items:center;gap:12px;">
                ${state.customer.logoUrl ? `<img src="${state.customer.logoUrl}" style="height:40px;border-radius:4px;border:1px solid #e2e8f0;">` : ''}
                <input id="pw-clogo" type="file" accept="image/*" style="font-size:12px;color:#475569;">
              </div>
            </div>

            <div style="grid-column: 1 / -1; margin-top: 10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Client Contacts</label>
                <button id="pw-add-contact" style="background:none;border:none;color:#2563eb;font-size:12px;font-weight:600;cursor:pointer;">+ Add Contact</button>
              </div>
              <div id="pw-contacts-container">
                ${state.contacts.map((c, i) => `
                  <div style="display:flex;gap:10px;margin-bottom:8px;">
                    <input class="pw-cname" data-idx="${i}" placeholder="Contact Name" value="${c.name}" style="flex:1;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                    <input class="pw-cemail" data-idx="${i}" type="email" placeholder="Email Address" value="${c.email}" style="flex:1;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                    <button class="pw-cdel" data-idx="${i}" style="color:#ef4444;background:none;border:none;font-weight:600;cursor:pointer;padding:0 8px;">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (state.step === 2) {
      bodyHtml = `
        <div style="padding:24px;display:flex;flex-direction:column;height:100%;box-sizing:border-box;">
          <h2 style="font-size:20px;color:#0f172a;margin-top:0;margin-bottom:6px;">Scope & Chapters</h2>
          <p style="font-size:13px;color:#64748b;margin-bottom:20px;">Outline the structural sections of the proposal. Markdown is supported (e.g., use "- " for bullet points, "**text**" for bold).</p>
          
          <div id="pw-chapters-container" style="flex:1;overflow-y:auto;padding-right:8px;margin-bottom:16px;">
            ${state.chapters.map((ch, i) => `
              <div style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:10px;padding:16px;background:#f8fafc;box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                  <div style="display:flex;gap:4px;align-items:center;flex:1;">
                    <button class="pw-ch-up" data-idx="${i}" style="padding:4px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;font-size:10px;" title="Move Up">▲</button>
                    <button class="pw-ch-down" data-idx="${i}" style="padding:4px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;font-size:10px;" title="Move Down">▼</button>
                    <input class="pw-ch-title" data-idx="${i}" value="${ch.title}" placeholder="Chapter Title" style="flex:1;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;font-weight:600;color:#0f172a;font-family:inherit;margin-left:8px;">
                  </div>
                  <button class="pw-ch-del" data-idx="${i}" style="margin-left:12px;padding:6px 10px;color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">✕ Remove</button>
                </div>
                <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;text-align:right;">Format: Markdown supported</div>
                <textarea class="pw-ch-content" data-idx="${i}" rows="5" placeholder="Chapter content..." style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;color:#334155;font-family:inherit;resize:vertical;box-sizing:border-box;">${ch.content}</textarea>
              </div>
            `).join('')}
          </div>
          
          <button id="pw-add-chapter" style="padding:10px 16px;background:#eff6ff;color:#2563eb;border:2px dashed #bfdbfe;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;width:100%;font-family:inherit;transition:0.2s;">+ Add New Chapter</button>
        </div>
      `;
    } else if (state.step === 3) {
      bodyHtml = `
        <div style="padding:24px;display:flex;flex-direction:column;height:100%;box-sizing:border-box;">
          <h2 style="font-size:20px;color:#0f172a;margin-top:0;margin-bottom:6px;">Budget & Terms</h2>
          <p style="font-size:13px;color:#64748b;margin-bottom:20px;">Define budget lines, estimated timeline, and terms.</p>
          
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Budget Details</label>
            <button id="pw-add-budget" style="background:none;border:none;color:#2563eb;font-size:12px;font-weight:600;cursor:pointer;">+ Add Line</button>
          </div>
          
          <div id="pw-budget-container" style="flex:1;overflow-y:auto;margin-bottom:16px;">
            <div style="display:grid;grid-template-columns:3fr 4fr 2fr 30px;gap:8px;font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px;padding:0 4px;">
              <div>Description</div><div>Details</div><div>Amount (US$)</div><div></div>
            </div>
            ${state.budgetLines.map((b, i) => `
              <div style="display:grid;grid-template-columns:3fr 4fr 2fr 30px;gap:8px;margin-bottom:8px;align-items:start;">
                <input class="pw-b-desc" data-idx="${i}" value="${b.description}" placeholder="e.g. Phase 1" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;box-sizing:border-box;">
                <input class="pw-b-det" data-idx="${i}" value="${b.details}" placeholder="Details" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;box-sizing:border-box;">
                <input class="pw-b-amt" data-idx="${i}" type="number" step="0.01" value="${b.amount}" placeholder="0.00" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;box-sizing:border-box;">
                <button class="pw-b-del" data-idx="${i}" style="color:#ef4444;background:none;border:none;font-weight:600;cursor:pointer;padding:8px 0;">✕</button>
              </div>
            `).join('')}
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Estimated Timeline</label>
              <input id="pw-timeline" placeholder="e.g. 8 - 10 Weeks" value="${state.timeline}" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;margin-top:6px;box-sizing:border-box;">
            </div>
            <div style="grid-column: 1 / -1;">
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Terms & Conditions</label>
              <textarea id="pw-notes" rows="4" style="width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;margin-top:6px;resize:vertical;box-sizing:border-box;">${state.notes}</textarea>
            </div>
          </div>
        </div>
      `;
    } else if (state.step === 4) {
      const totalAmount = state.budgetLines.reduce((s, b) => s + (Number(b.amount) || 0), 0);
      bodyHtml = `
        <div style="padding:24px;display:flex;flex-direction:column;align-items:center;text-align:center;">
          <div style="width:64px;height:64px;background:#dbeafe;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:28px;">📝</span>
          </div>
          <h2 style="font-size:22px;color:#0f172a;margin-top:0;margin-bottom:8px;">Generate DOCX Proposal</h2>
          <p style="font-size:14px;color:#475569;max-width:400px;line-height:1.5;">You are about to generate a formatted Word document (.docx) for <strong>${state.projectName || 'Unnamed Project'}</strong>.</p>
          
          <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:20px;border-radius:12px;margin-top:24px;width:100%;max-width:480px;text-align:left;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
              <div style="color:#64748b;">Reference:</div><div style="font-weight:600;color:#0f172a;text-align:right;">${state.docRef}</div>
              <div style="color:#64748b;">Client:</div><div style="font-weight:600;color:#0f172a;text-align:right;">${state.customer.company || '—'}</div>
              <div style="color:#64748b;">Total Budget:</div><div style="font-weight:700;color:#15803d;text-align:right;">US$${fmt(totalAmount)}</div>
              <div style="color:#64748b;">Chapters Included:</div><div style="font-weight:600;color:#0f172a;text-align:right;">${state.chapters.length}</div>
              <div style="color:#64748b;">Contacts Included:</div><div style="font-weight:600;color:#0f172a;text-align:right;">${state.contacts.length}</div>
            </div>
          </div>
        </div>
      `;
    }

    const stepIndicators = [1, 2, 3, 4].map(s => {
      const active = s === state.step;
      const completed = s < state.step;
      const bg = active ? '#2563eb' : (completed ? '#10b981' : '#e2e8f0');
      const fg = (active || completed) ? '#fff' : '#64748b';
      return `<div style="width:28px;height:28px;border-radius:50%;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${completed ? '✓' : s}</div>`;
    }).join('<div style="height:2px;flex:1;background:#e2e8f0;margin:0 8px;"></div>');

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:860px;max-width:95vw;height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.4);">
        
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
        
        <div style="flex:1;overflow-y:auto;position:relative;">
          ${bodyHtml}
        </div>

        <div style="padding:16px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
          <button id="pw-prev" style="padding:10px 20px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;color:#475569;transition:0.2s;visibility:${state.step > 1 ? 'visible' : 'hidden'}">← Back</button>
          
          <div style="display:flex; gap:12px;">
            ${state.step === 4 ? `
              <button id="pw-download" style="padding:10px 24px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;color:#475569;transition:0.2s;">⬇ Download DOCX</button>
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
      
      overlay.querySelectorAll('.pw-cname').forEach(inp => state.contacts[inp.dataset.idx].name = inp.value);
      overlay.querySelectorAll('.pw-cemail').forEach(inp => state.contacts[inp.dataset.idx].email = inp.value);
    } else if (state.step === 2) {
      overlay.querySelectorAll('.pw-ch-title').forEach(inp => { state.chapters[inp.dataset.idx].title = inp.value; });
      overlay.querySelectorAll('.pw-ch-content').forEach(inp => { state.chapters[inp.dataset.idx].content = inp.value; });
    } else if (state.step === 3) {
      overlay.querySelectorAll('.pw-b-desc').forEach(inp => { state.budgetLines[inp.dataset.idx].description = inp.value; });
      overlay.querySelectorAll('.pw-b-det').forEach(inp => { state.budgetLines[inp.dataset.idx].details = inp.value; });
      overlay.querySelectorAll('.pw-b-amt').forEach(inp => { state.budgetLines[inp.dataset.idx].amount = Number(inp.value) || 0; });
      
      state.timeline = overlay.querySelector('#pw-timeline')?.value || state.timeline;
      state.notes = overlay.querySelector('#pw-notes')?.value || state.notes;
    }
  }

  function bindEvents() {
    overlay.querySelector('#pw-close').onclick = () => overlay.remove();
    
    if (state.step === 1) {
      const fileInput = overlay.querySelector('#pw-clogo');
      if (fileInput) {
        fileInput.onchange = e => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = ev => { state.customer.logoUrl = ev.target.result; render(); };
            reader.readAsDataURL(file);
          }
        };
      }
      overlay.querySelectorAll('.pw-cdel').forEach(btn => {
        btn.onclick = e => { saveCurrentStepData(); state.contacts.splice(e.target.dataset.idx, 1); render(); };
      });
      overlay.querySelector('#pw-add-contact').onclick = () => {
        saveCurrentStepData(); state.contacts.push({ name: '', email: '' }); render();
      };
    }

    if (state.step === 2) {
      overlay.querySelectorAll('.pw-ch-del').forEach(btn => {
        btn.onclick = e => { saveCurrentStepData(); state.chapters.splice(e.target.dataset.idx, 1); render(); };
      });
      overlay.querySelectorAll('.pw-ch-up').forEach(btn => {
        btn.onclick = e => { 
          saveCurrentStepData(); 
          const idx = Number(e.target.dataset.idx);
          if (idx > 0) {
            const temp = state.chapters[idx];
            state.chapters[idx] = state.chapters[idx - 1];
            state.chapters[idx - 1] = temp;
            render();
          }
        };
      });
      overlay.querySelectorAll('.pw-ch-down').forEach(btn => {
        btn.onclick = e => { 
          saveCurrentStepData(); 
          const idx = Number(e.target.dataset.idx);
          if (idx < state.chapters.length - 1) {
            const temp = state.chapters[idx];
            state.chapters[idx] = state.chapters[idx + 1];
            state.chapters[idx + 1] = temp;
            render();
          }
        };
      });
      overlay.querySelector('#pw-add-chapter').onclick = () => {
        saveCurrentStepData();
        state.chapters.push({ id: uid4(), title: 'New Chapter', content: '' });
        render();
      };
    }

    if (state.step === 3) {
      overlay.querySelectorAll('.pw-b-del').forEach(btn => {
        btn.onclick = e => { saveCurrentStepData(); state.budgetLines.splice(e.target.dataset.idx, 1); render(); };
      });
      overlay.querySelector('#pw-add-budget').onclick = () => {
        saveCurrentStepData();
        state.budgetLines.push({ description: '', details: '', amount: 0 });
        render();
      };
    }

    const prevBtn = overlay.querySelector('#pw-prev');
    if (prevBtn) prevBtn.onclick = () => { saveCurrentStepData(); if (state.step > 1) { state.step--; render(); } };

    const nextBtn = overlay.querySelector('#pw-next');
    if (nextBtn) nextBtn.onclick = () => { saveCurrentStepData(); if (state.step < 4) { state.step++; render(); } };

    const downloadBtn = overlay.querySelector('#pw-download');
    if (downloadBtn) downloadBtn.onclick = () => generateDocxAndAct('download');

    const saveBtn = overlay.querySelector('#pw-save');
    if (saveBtn) saveBtn.onclick = () => generateDocxAndAct('save');
  }

  function parseMarkdownToDocxParagraphs(text) {
    const lines = text.split('\n');
    return lines.map(line => {
      let isBullet = false;
      let textContent = line;
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        isBullet = true;
        textContent = line.trim().substring(2);
      }

      // Very simple bold parsing for **text**
      const runs = [];
      const parts = textContent.split(/\*\*(.*?)\*\*/g);
      parts.forEach((p, i) => {
        if (i % 2 === 1) runs.push(new docx.TextRun({ text: p, bold: true, font: "Arial" }));
        else if (p) runs.push(new docx.TextRun({ text: p, font: "Arial" }));
      });

      if (runs.length === 0) {
        runs.push(new docx.TextRun({ text: " ", font: "Arial" }));
      }

      const paraProps = { children: runs, spacing: { after: 120 } };
      if (isBullet) paraProps.bullet = { level: 0 };
      
      return new docx.Paragraph(paraProps);
    });
  }

  async function generateDocxAndAct(action) {
    const totalAmount = state.budgetLines.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    
    const logoDataUrl = await getLogoBase64();
    let logoBuffer = null;
    if (logoDataUrl) {
      try {
        const logoBase64 = logoDataUrl.split(',')[1];
        logoBuffer = Uint8Array.from(atob(logoBase64), c => c.charCodeAt(0)).buffer;
      } catch(e) {}
    }

    const docSections = [];

    // Cover Info
    docSections.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({ text: state.projectName || 'Development Agreement', bold: true, size: 36, font: "Arial", color: "0f172a" }),
        ],
        spacing: { after: 400 }
      }),
      new docx.Paragraph({
        children: [
          new docx.TextRun({ text: "PREPARED FOR:", bold: true, size: 24, font: "Arial", color: "64748b" }),
        ],
        spacing: { after: 200 }
      }),
      new docx.Paragraph({
        children: [
          new docx.TextRun({ text: state.customer.company || "Company", bold: true, size: 28, font: "Arial" }),
        ],
        spacing: { after: 200 }
      })
    );

    state.contacts.forEach(c => {
      if (c.name || c.email) {
        docSections.push(new docx.Paragraph({
          children: [
            new docx.TextRun({ text: `${c.name} ${c.email ? '(' + c.email + ')' : ''}`, size: 24, font: "Arial" }),
          ],
          spacing: { after: 100 }
        }));
      }
    });

    docSections.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));

    // Chapters
    state.chapters.forEach(ch => {
      docSections.push(
        new docx.Paragraph({
          heading: docx.HeadingLevel.HEADING_1,
          children: [new docx.TextRun({ text: ch.title, bold: true, size: 32, font: "Arial", color: "1e3a5f" })],
          spacing: { before: 400, after: 200 }
        })
      );
      docSections.push(...parseMarkdownToDocxParagraphs(ch.content));
    });

    docSections.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));

    // Budget Table
    docSections.push(
      new docx.Paragraph({
        children: [new docx.TextRun({ text: "Budget & Pricing", bold: true, size: 32, font: "Arial", color: "1e3a5f" })],
        spacing: { before: 400, after: 200 }
      })
    );

    const tableRows = [
      new docx.TableRow({
        children: [
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Description", bold: true, font: "Arial" })] })], shading: { fill: "f1f5f9" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Details", bold: true, font: "Arial" })] })], shading: { fill: "f1f5f9" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Amount (US$)", bold: true, font: "Arial" })] })], shading: { fill: "f1f5f9" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
        ]
      })
    ];

    state.budgetLines.forEach(b => {
      tableRows.push(
        new docx.TableRow({
          children: [
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: b.description, font: "Arial" })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: b.details, font: "Arial" })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: fmt(b.amount), font: "Arial" })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          ]
        })
      );
    });

    // Total Row
    tableRows.push(
      new docx.TableRow({
        children: [
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Total Project Cost", bold: true, font: "Arial" })] })], columnSpan: 2, shading: { fill: "e2e8f0" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: `US$${fmt(totalAmount)}`, bold: true, font: "Arial" })] })], shading: { fill: "e2e8f0" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
        ]
      })
    );

    docSections.push(
      new docx.Table({
        rows: tableRows,
        width: { size: 100, type: docx.WidthType.PERCENTAGE }
      })
    );

    // Terms & Notes
    docSections.push(
      new docx.Paragraph({
        children: [new docx.TextRun({ text: "Timeline & Terms", bold: true, size: 28, font: "Arial", color: "1e3a5f" })],
        spacing: { before: 400, after: 200 }
      }),
      new docx.Paragraph({
        children: [new docx.TextRun({ text: `Estimated Timeline: ${state.timeline}`, font: "Arial", bold: true })],
        spacing: { after: 200 }
      })
    );
    docSections.push(...parseMarkdownToDocxParagraphs(state.notes));

    // Authorization to Proceed (Signatures)
    docSections.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
    docSections.push(
      new docx.Paragraph({
        children: [new docx.TextRun({ text: "Authorization to Proceed", bold: true, size: 32, font: "Arial", color: "1e3a5f" })],
        spacing: { before: 400, after: 400 }
      })
    );

    docSections.push(
      new docx.Table({
        borders: docx.TableBorders.NONE,
        width: { size: 100, type: docx.WidthType.PERCENTAGE },
        rows: [
          new docx.TableRow({
            children: [
              new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Atlas Design & Technology", bold: true, font: "Arial" })] }), new docx.Paragraph({ text: "\n\n_______________________\nSignature" }), new docx.Paragraph({ text: "\n_______________________\nName / Title" }), new docx.Paragraph({ text: "\n_______________________\nDate" })] }),
              new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: state.customer.company || "Client", bold: true, font: "Arial" })] }), new docx.Paragraph({ text: "\n\n_______________________\nSignature" }), new docx.Paragraph({ text: "\n_______________________\nName / Title" }), new docx.Paragraph({ text: "\n_______________________\nDate" })] })
            ]
          })
        ]
      })
    );

    const headerChildren = [];
    if (logoBuffer) {
      headerChildren.push(new docx.Paragraph({ children: [new docx.ImageRun({ data: logoBuffer, transformation: { width: 140, height: 44 } })], alignment: docx.AlignmentType.LEFT }));
    }

    const doc = new docx.Document({
      sections: [{
        properties: {
          page: { margin: { top: 1200, bottom: 1200, left: 1440, right: 1440 } }
        },
        headers: {
          default: new docx.Header({
            children: [
              new docx.Table({
                width: { size: 100, type: docx.WidthType.PERCENTAGE },
                borders: docx.TableBorders.NONE,
                rows: [
                  new docx.TableRow({
                    children: [
                      new docx.TableCell({ children: headerChildren, shading: { fill: "1e3a5f" }, margins: { top: 200, bottom: 200, left: 200, right: 200 }, verticalAlign: docx.VerticalAlign.CENTER }),
                      new docx.TableCell({
                        children: [
                          new docx.Paragraph({ children: [new docx.TextRun({ text: "PROJECT PROPOSAL", bold: true, color: "ffffff", size: 28, font: "Arial" })], alignment: docx.AlignmentType.RIGHT }),
                          new docx.Paragraph({ children: [new docx.TextRun({ text: state.docRef, color: "ffffff", size: 18, font: "Arial" })], alignment: docx.AlignmentType.RIGHT }),
                          new docx.Paragraph({ children: [new docx.TextRun({ text: `Date: ${state.date}`, color: "b4c8dc", size: 16, font: "Arial" })], alignment: docx.AlignmentType.RIGHT })
                        ],
                        shading: { fill: "1e3a5f" }, margins: { top: 200, bottom: 200, left: 200, right: 200 }, verticalAlign: docx.VerticalAlign.CENTER
                      })
                    ]
                  }),
                  new docx.TableRow({
                    children: [
                      new docx.TableCell({ children: [], columnSpan: 2, shading: { fill: "14b8a6" }, height: { value: 40, rule: docx.HeightRule.EXACT } })
                    ]
                  })
                ]
              }),
              new docx.Paragraph({ spacing: { after: 400 } })
            ]
          })
        },
        footers: {
          default: new docx.Footer({
            children: [
              new docx.Paragraph({ border: { top: { color: "e2e8f0", space: 1, value: docx.BorderStyle.SINGLE, size: 6 } }, spacing: { before: 200, after: 100 } }),
              new docx.Table({
                width: { size: 100, type: docx.WidthType.PERCENTAGE },
                borders: docx.TableBorders.NONE,
                rows: [
                  new docx.TableRow({
                    children: [
                      new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Atlas Design & Technology", size: 14, color: "94a3b8", font: "Arial" })] })] }),
                      new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Page ", size: 14, color: "94a3b8", font: "Arial" }), docx.PageNumber.CURRENT, new docx.TextRun({ text: " of ", size: 14, color: "94a3b8", font: "Arial" }), docx.PageNumber.TOTAL_PAGES], alignment: docx.AlignmentType.CENTER })] }),
                      new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Confidential & Proprietary", size: 14, color: "94a3b8", font: "Arial" })], alignment: docx.AlignmentType.RIGHT })] })
                    ]
                  })
                ]
              })
            ]
          })
        },
        children: docSections
      }]
    });

    const b64string = await docx.Packer.toBase64String(doc);

    const fileName = `AtlasDT_Proposal_${state.docRef}.docx`;

    if (action === 'download') {
      // Browser download base64
      const link = document.createElement('a');
      link.href = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,' + b64string;
      link.download = fileName;
      link.click();
    } else if (action === 'save') {
      const btn = overlay.querySelector('#pw-save');
      if (btn) { btn.disabled = true; btn.textContent = '☁ Uploading...'; }
      try {
        const docData = {
          title: 'Project Proposal',
          prefix: 'PRP',
          docRef: state.docRef,
          projectName: state.projectName || 'Proposal',
          rfqRef: state.docRef, 
          type: 'proposal',
          customer: { name: state.contacts[0]?.name || '', company: state.customer.company }
        };
        const publicUrl = await uploadAndSyncDoc(b64string, docData, { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
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
