import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../utils/supabaseClient.js';

const DOC_TYPES = {
  quotation:  { title: 'Quotation',          prefix: 'QT',  emailSubject: 'Your Quotation from AtlasDT' },
  proforma:   { title: 'Proforma Invoice',   prefix: 'PI',  emailSubject: 'Proforma Invoice from AtlasDT' },
  invoice:    { title: 'Commercial Invoice',  prefix: 'INV', emailSubject: 'Commercial Invoice from AtlasDT' },
};

function fmt(n) { return Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
function uid4() { return Math.random().toString(36).slice(2,6).toUpperCase(); }
function today() { return new Date().toISOString().slice(0,10); }

let _logoBase64 = null;
export async function getLogoBase64() {
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

export function generatePDF(docData, logoDataUrl) {
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
  doc.setDrawColor(20, 184, 166);
  doc.line(margin, ph - 22, margin + 40, ph - 22);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Atlas Design & Technology', margin, ph - 16);
  doc.setFont('helvetica', 'normal');
  doc.text('Company Reg: 624 393 189', margin, ph - 12);
  
  doc.setTextColor(148, 163, 184);
  doc.text('Confidential & Proprietary', pw - margin, ph - 16, { align: 'right' });

  return doc;
}

export async function uploadAndSyncDoc(fileBase64, docData, opts = { ext: 'pdf', mime: 'application/pdf' }) {
  const fileName = `AtlasDT_${docData.title.replace(/\s+/g,'_')}_${docData.docRef}_${docData.projectName.replace(/[^a-zA-Z0-9]/g,'_')}.${opts.ext}`;
  const storagePath = `${docData.rfqRef}/${fileName}`;

  console.log('[HeadlessDocs] Uploading PDF via Netlify function...', { storagePath, bucket: 'rfq-docs' });

  // Upload via Netlify function (service role key bypasses RLS)
  const uploadRes = await fetch('/.netlify/functions/storage-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileBase64: fileBase64,
      fileName: fileName,
      filePath: storagePath,
      contentType: opts.mime,
      bucket: 'rfq-docs'
    })
  });

  const uploadBody = await uploadRes.json().catch(() => ({ error: uploadRes.statusText }));
  console.log('[HeadlessDocs] Upload response:', uploadRes.status, uploadBody);

  if (!uploadRes.ok || !uploadBody.success) {
    throw new Error('Storage upload failed: ' + (uploadBody.error || uploadRes.statusText));
  }

  const publicUrl = uploadBody.publicUrl;
  console.log('[HeadlessDocs] Public URL:', publicUrl);
  if (!publicUrl) throw new Error('Could not get public URL for document');

  // Sync to OneDrive via webhook
  const folderIdentifier = docData.customer?.company || docData.customer?.name || '';
  const companySuffix = folderIdentifier ? ` - ${folderIdentifier.replace(/[\/\\?%*:|"<>]/g, '')}` : '';
  const webhookPayload = {
    file_name: fileName,
    file_url: publicUrl,
    folder_path: `RFQs/${docData.rfqRef}${companySuffix}`,
    metadata: { rfqRef: docData.rfqRef, type: docData.type }
  };
  console.log('[HeadlessDocs] Sending to SharePoint webhook:', webhookPayload);

  try {
    const spRes = await fetch('/.netlify/functions/webhook-sharepoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });
    const spBody = await spRes.json().catch(() => ({}));
    console.log('[HeadlessDocs] SharePoint webhook response:', spRes.status, spBody);
    if (!spRes.ok) console.error('[HeadlessDocs] Webhook returned error:', spRes.status, spBody);
  } catch (err) {
    console.error('[HeadlessDocs] Webhook fetch failed:', err);
  }

  return publicUrl;
}

export async function generateAllDocsHeadless({ rfq, rfqData, profile, includeGst = false }) {
  const logoDataUrl = await getLogoBase64();
  const data = rfqData || rfq.rfq_data || {};
  const ref = 'ADT-' + (rfq.id||'').slice(0,8).toUpperCase();
  const parts = data.parts || [];
  
  let lineItems = parts.map((p, i) => ({
    description: p.name || 'Part',
    details: [p.process, p.material].filter(Boolean).join(' · '),
    qty: Number(p.qty) || 1,
    unitPrice: Number(p.price) || 0,
  }));
  if (!lineItems.length) {
    lineItems.push({ description: 'Project Service', details: '', qty: 1, unitPrice: Number(data.total_price) || 0 });
  }

  const custName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '';
  const custEmail = profile?.email || '';
  const custCompany = profile?.company || '';
  const projectName = data.project_name || 'Unnamed Project';
  
  const getAddr = (a) => {
    if (!a) return {};
    if (typeof a === 'string') { try { return JSON.parse(a); } catch (e) { return { line1: a }; } }
    return a;
  };
  const bAddr = getAddr(profile?.address);
  const sAddr = getAddr(profile?.shipping_address);
  const bPhone = [bAddr.phone_prefix, bAddr.phone].filter(Boolean).join(' ');
  const sPhone = [sAddr.phone_prefix, sAddr.phone].filter(Boolean).join(' ');

  const billTo = {
    name: custName, company: custCompany, email: custEmail,
    addr1: bAddr.line1||'', addr2: bAddr.line2||'', city: bAddr.city||'',
    state: bAddr.state||'', postcode: bAddr.postcode||'', phone: bPhone
  };
  const fmtAddr = (a) => [a.addr1, a.addr2, [a.city, a.state, a.postcode].filter(Boolean).join(' '), a.phone ? 'Ph: ' + a.phone : ''].filter(Boolean).join(', ');
  billTo.address = fmtAddr(billTo);

  const shipTo = { ...billTo };

  const subtotal = lineItems.reduce((s,li) => s + (li.qty * li.unitPrice), 0);
  const gstAmount = includeGst ? subtotal * 0.10 : 0;
  const total = subtotal + gstAmount;
  
  const notes = 'Payment due within 14 days of issue date.\\nPrices quoted in USD. All prices are EXW unless otherwise specified.\\n\\nBank Transfer Details:\\nBank: NAB — National Australia Bank\\nAccount Name: Paniani Products Pty Ltd\\nBSB: 083-004  |  Account No: 978 360 554\\nSWIFT / BIC: NATAAU3303';

  const typesToGen = ['quotation', 'proforma'];
  const results = [];

  for (const docType of typesToGen) {
    const cfg = DOC_TYPES[docType];
    const docRef = cfg.prefix + '-' + uid4();
    const docData = {
      type: docType, title: cfg.title, prefix: cfg.prefix, docRef: docRef,
      date: today(), rfqId: rfq.id, rfqRef: ref, projectName,
      customer: billTo, shipTo: shipTo, shipSameAsBill: true,
      lineItems: lineItems, subtotal, includeGst, gstAmount, total,
      notes: notes, createdAt: new Date().toISOString(), status: 'sent', sentAt: new Date().toISOString()
    };

    const pdf = generatePDF(docData, logoDataUrl);
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    
    const publicUrl = await uploadAndSyncDoc(pdfBase64, docData);
    docData.publicUrl = publicUrl; 
    results.push(docData);
  }

  return results;
}
