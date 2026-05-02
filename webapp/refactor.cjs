const fs = require('fs');
let code = fs.readFileSync('src/js/services/doc-generator.js', 'utf8');

const pdfRegex = /  \/\/ ── Generate PDF ──\n  function generatePDF\(docData\) \{[\s\S]*?(?=  \/\/ ── Sync Helper ──)/;
const syncRegex = /  \/\/ ── Sync Helper ──\n  const uploadAndSyncDoc = async \(pdfBase64, docData\) => \{[\s\S]*?(?=  \/\/ ── Sync Helper for Parts ──)/;

let pdfMatch = code.match(pdfRegex);
let syncMatch = code.match(syncRegex);

if (pdfMatch && syncMatch) {
  let pdfStr = pdfMatch[0];
  let syncStr = syncMatch[0];

  code = code.replace(pdfStr, '');
  code = code.replace(syncStr, '');
  
  pdfStr = pdfStr.replace('function generatePDF(docData) {', 'export function generatePDF(docData, logoDataUrl) {');
  syncStr = syncStr.replace('const uploadAndSyncDoc = async (pdfBase64, docData) => {', 'export async function uploadAndSyncDoc(pdfBase64, docData) {');
  syncStr = syncStr.replace('if (uploadData.publicUrl) {', 'if (uploadData.publicUrl) {\n      const retUrl = uploadData.publicUrl;');
  syncStr = syncStr.replace('} else {\n      throw new Error', 'return retUrl;\n    } else {\n      throw new Error');
  
  code = code.replace(/generatePDF\(docData\)/g, 'generatePDF(docData, logoDataUrl)');

  const headlessStr = `
// ── Headless Document Generator ──
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

  const typesToGen = ['quotation', 'proforma', 'invoice'];
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
    
    const uploadRes = await uploadAndSyncDoc(pdfBase64, docData);
    docData.publicUrl = uploadRes; 
    results.push(docData);
  }

  return results;
}
`;

  code = code + '\n' + pdfStr + '\n' + syncStr + '\n' + headlessStr;
  fs.writeFileSync('src/js/services/doc-generator.js', code);
  console.log('Successfully updated doc-generator.js');
} else {
  console.log('Failed to match Regex');
}
