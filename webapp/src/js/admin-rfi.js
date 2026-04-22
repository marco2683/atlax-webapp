import { supabase } from './supabase.js';

/**
 * Utility to safely extract string data from an ExcelJS cell.
 * Handles both plain strings and richText objects.
 */
function getCellText(cell) {
  if (!cell || !cell.value) return '';
  if (typeof cell.value === 'string') return cell.value.trim();
  if (cell.value.richText) {
    return cell.value.richText.map(rt => rt.text).join('').trim();
  }
  return String(cell.value).trim();
}

/**
 * Extracts and converts an ArrayBuffer image to a Blob.
 */
function getImageBlob(wb, imageId) {
  const model = wb.model.media.find(m => m.index === imageId);
  if (!model || !model.buffer) return null;
  const extension = model.extension || 'png';
  const buffer = model.buffer;
  return new Blob([buffer], { type: `image/${extension}` });
}

export async function initRfiImporter(file, refreshCallback) {
  if (!window.ExcelJS) {
    alert('ExcelJS is not loaded yet. Please wait a moment and try again.');
    return;
  }

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.85)';
  overlay.style.zIndex = '99999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.color = '#fff';
  overlay.innerHTML = `<div class="spinner"></div><h3 style="margin-top:20px;" id="rfi-progress-text">Reading RFI File...</h3>`;
  document.body.appendChild(overlay);

  const updateProgress = (txt) => {
    document.getElementById('rfi-progress-text').innerText = txt;
  };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    updateProgress('Parsing primary supplier data...');
    const ws1 = wb.worksheets[0]; // RFI

    // Field mapping
    const legalName = getCellText(ws1.getCell('D11'));
    const tradingName = getCellText(ws1.getCell('K11'));
    const countryCity = getCellText(ws1.getCell('D12'));
    const website = getCellText(ws1.getCell('K12'));
    const address = getCellText(ws1.getCell('E13'));
    const founded = getCellText(ws1.getCell('D14'));
    const taxId = getCellText(ws1.getCell('K15'));
    
    // Split country & city
    let [country, city] = countryCity.split(',').map(s=>s.trim());
    if (!city) {
      const parts = countryCity.split(' ');
      if (parts.length > 1) {
        country = parts[0];
        city = parts.slice(1).join(' ');
      }
    }

    // Size / Employees
    const empStr = getCellText(ws1.getCell('D28'));
    const empExtracted = parseInt(empStr.replace(/\D/g, ''), 10);
    const size = (!isNaN(empExtracted) && empExtracted > 500) ? 'Large Enterprise' : 'SME';

    // Revenue
    const revStr = getCellText(ws1.getCell('L34'));

    // Description & Services
    const desc = getCellText(ws1.getCell('D52'));
    const techs = getCellText(ws1.getCell('D58')) || '';
    const techArray = techs.split(/[\n,;]/).map(t=>t.trim()).filter(Boolean);

    // Certifications
    const certs = [];
    if (getCellText(ws1.getCell('G42')).toLowerCase().includes('yes')) certs.push('ISO 9001');
    if (getCellText(ws1.getCell('G43')).toLowerCase().includes('yes')) certs.push('ISO 14001');
    if (getCellText(ws1.getCell('G44')).toLowerCase().includes('yes')) certs.push('ISO 45001');
    if (getCellText(ws1.getCell('G45')).toLowerCase().includes('yes')) certs.push('IATF 16949');
    if (getCellText(ws1.getCell('G46')).toLowerCase().includes('yes')) certs.push('ISO 13485');

    // Build the Supplier object
    const newSupplierId = crypto.randomUUID();
    const newSupplier = {
      id: newSupplierId,
      name: tradingName || legalName || 'Unknown Supplier',
      segment: 'TIER 2', // Default
      tech_group: techArray.length > 0 ? techArray[0] : 'General',
      data: {
        nameZh: legalName || null,
        country: country || null,
        city: city || null,
        address: address || null,
        website: website || null,
        foundedYear: founded ? String(founded) : null,
        tax_id: taxId || null,
        size: size || 'SME',
        description: desc || '',
        technologies: techArray,
        certifications: certs,
        isPublic: false,
        isActive: true,
        images: { product: [], factory: [] },
        product_gallery: [],
        factory_gallery: []
      }
    };

    // Upload Original RFI File
    updateProgress('Archiving original RFI template...');
    const rfiExt = file.name.split('.').pop() || 'xlsx';
    const rfiFileName = `rfi/${newSupplierId}/Original_RFI_${crypto.randomUUID()}.${rfiExt}`;
    const { error: rfiUploadErr } = await supabase.storage.from('supplier-assets').upload(rfiFileName, file, { cacheControl: '3600' });
    if (!rfiUploadErr) {
       newSupplier.data.rfi_document_url = supabase.storage.from('supplier-assets').getPublicUrl(rfiFileName).data.publicUrl;
    }

    // Extract Images from dynamically located Sheets
    updateProgress('Extracting gallery contents...');
    const wsProduct = wb.worksheets.find(w => w.name && w.name.toLowerCase().includes('product'));
    const wsFactory = wb.worksheets.find(w => w.name && w.name.toLowerCase().includes('factory'));

    let storageErrors = [];

    const processSheetImages = async (sheetObj, typePrefix, targetUrlArray, targetDataArray) => {
      if (!sheetObj) return;
      const imgs = sheetObj.getImages();
      for (const img of imgs) {
        // Native properties are 0-indexed: nativeCol 1 = B (Title), nativeCol 2 = C (Description).
        const rowNum = (img.range.tl.nativeRow !== undefined ? img.range.tl.nativeRow : img.range.tl.row) + 1;
        const title = getCellText(sheetObj.getCell(rowNum, 2)) || '';
        const desc = getCellText(sheetObj.getCell(rowNum, 3)) || '';

        const model = wb.model.media.find(m => m.index === img.imageId);
        const buffer = model ? model.buffer : (wb.getImage ? wb.getImage(img.imageId)?.buffer : null);
        const extension = model ? model.extension : (wb.getImage ? wb.getImage(img.imageId)?.extension : 'png');

        if (buffer) {
           const blob = new Blob([buffer], { type: `image/${extension || 'png'}` });
           const fileName = `rfi/${newSupplierId}/${typePrefix}_${crypto.randomUUID()}.${extension || 'png'}`;
           updateProgress(`Uploading ${typePrefix} thumbnail...`);
           const { error } = await supabase.storage.from('supplier-assets').upload(fileName, blob, {
             cacheControl: '3600'
           });
           if (!error) {
             const publicUrl = supabase.storage.from('supplier-assets').getPublicUrl(fileName).data.publicUrl;
             targetUrlArray.push(publicUrl);
             targetDataArray.push({ title, description: desc, url: publicUrl });
           } else {
             console.error('Image upload error:', error);
             storageErrors.push(error.message);
           }
        }
      }
    };

    await processSheetImages(wsProduct, 'product', newSupplier.data.images.product, newSupplier.data.product_gallery);
    await processSheetImages(wsFactory, 'factory', newSupplier.data.images.factory, newSupplier.data.factory_gallery);

    updateProgress('Saving supplier profile...');
    const { error: insErr } = await supabase.from('suppliers').insert(newSupplier);
    if (insErr) {
      throw new Error(insErr.message);
    }

    console.log('[RFI Parser] Completely saved:', newSupplier);
    const totalImages = newSupplier.data.images.product.length + newSupplier.data.images.factory.length;
    
    let alertMsg = `Successfully imported ${newSupplier.name} with ${totalImages} images!\n`;
    if (rfiUploadErr) alertMsg += `\nWarning: RFI Document failed to upload. (${rfiUploadErr.message})`;
    if (storageErrors.length > 0) alertMsg += `\nWarning: ${storageErrors.length} images failed to upload. Supabase blocked it: "${storageErrors[0]}"`;
    
    alert(alertMsg);
    if (refreshCallback) refreshCallback();

  } catch (error) {
    console.error('[RFI] Import Failed:', error);
    alert('Import failed: ' + error.message);
  } finally {
    document.body.removeChild(overlay);
  }
}
