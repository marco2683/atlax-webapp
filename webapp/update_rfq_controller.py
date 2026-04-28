import re

with open('src/js/components/rfq-controller.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the hardcoded shipping section
old_shipping_logic = """    // Shipping calculation
    let shippingCost = 0;
    let shippingHtml = '';
    if (document.getElementById('calc-shipping-cb')?.checked) {
      const dimWeightKg = totalVolumeCm3 / 5000;
      const actualWeightKg = totalWeightGrams / 1000;
      const chargeableWeight = Math.max(dimWeightKg, actualWeightKg);
      
      const seaFreight = Math.max(20, chargeableWeight * 3);
      const economyAir = Math.max(30, chargeableWeight * 8);
      const expressAir = Math.max(40, chargeableWeight * 15);
      
      shippingCost = economyAir;
      grandTotal += shippingCost;
      
      shippingHtml = `
        <div class="rfq-quote-shipping-options" style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--color-steel-300);">
          <h4 style="font-size: 12px; font-weight: 600; color: var(--color-steel-400); margin-bottom: 12px; text-transform: uppercase;">Shipping Options</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; cursor: pointer;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="rfq_shipping" value="${seaFreight}" style="accent-color: var(--color-emerald-500);">
                <span>Sea Freight <span style="color: var(--color-steel-400); font-size: 11px;">(30-40 days)</span></span>
              </div>
              <span style="font-weight: 600;">$${seaFreight.toFixed(2)}</span>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; cursor: pointer;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="rfq_shipping" value="${economyAir}" checked style="accent-color: var(--color-emerald-500);">
                <span>Economy Air <span style="color: var(--color-steel-400); font-size: 11px;">(8-12 days)</span></span>
              </div>
              <span style="font-weight: 600;">$${economyAir.toFixed(2)}</span>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; cursor: pointer;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="rfq_shipping" value="${expressAir}" style="accent-color: var(--color-emerald-500);">
                <span>Express Air <span style="color: var(--color-steel-400); font-size: 11px;">(3-5 days)</span></span>
              </div>
              <span style="font-weight: 600;">$${expressAir.toFixed(2)}</span>
            </label>
          </div>
        </div>
      `;
    }"""

new_shipping_logic = """    // Shipping calculation
    let shippingCost = 0;
    let shippingHtml = '';
    if (document.getElementById('calc-shipping-cb')?.checked) {
      const dimWeightKg = totalVolumeCm3 / 5000;
      const actualWeightKg = totalWeightGrams / 1000;
      const chargeableWeight = Math.max(dimWeightKg, actualWeightKg);
      
      // Get the configured shipping region (default to rest_of_world if not found)
      const selRegion = shippingData.country || 'rest_of_world';
      const shippingRegions = PRICING_CONFIG.globalSettings?.shipping?.regions || {};
      const reg = shippingRegions[selRegion] || shippingRegions['rest_of_world'];
      
      // Calculate costs using pricing engine formulas if available, fallback to defaults
      const seaFreight = Math.max((reg?.seaFreight?.base || 20), chargeableWeight * (reg?.seaFreight?.perKg || 3));
      const economyAir = Math.max((reg?.economyAir?.base || 30), chargeableWeight * (reg?.economyAir?.perKg || 8));
      const expressAir = Math.max((reg?.expressAir?.base || 40), chargeableWeight * (reg?.expressAir?.perKg || 15));
      
      const seaDays = reg?.seaFreight?.days || '30-40';
      const ecoDays = reg?.economyAir?.days || '8-12';
      const expDays = reg?.expressAir?.days || '3-5';
      
      shippingCost = economyAir;
      grandTotal += shippingCost;
      
      shippingHtml = `
        <div class="rfq-quote-shipping-options" style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--color-steel-300);">
          <h4 style="font-size: 12px; font-weight: 600; color: var(--color-steel-400); margin-bottom: 12px; text-transform: uppercase;">Shipping Options</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; cursor: pointer;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="rfq_shipping" value="${seaFreight}" style="accent-color: var(--color-emerald-500);">
                <span>Sea Freight <span style="color: var(--color-steel-400); font-size: 11px;">(${seaDays} days)</span></span>
              </div>
              <span style="font-weight: 600;">$${seaFreight.toFixed(2)}</span>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; cursor: pointer;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="rfq_shipping" value="${economyAir}" checked style="accent-color: var(--color-emerald-500);">
                <span>Economy Air <span style="color: var(--color-steel-400); font-size: 11px;">(${ecoDays} days)</span></span>
              </div>
              <span style="font-weight: 600;">$${economyAir.toFixed(2)}</span>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; cursor: pointer;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="radio" name="rfq_shipping" value="${expressAir}" style="accent-color: var(--color-emerald-500);">
                <span>Express Air <span style="color: var(--color-steel-400); font-size: 11px;">(${expDays} days)</span></span>
              </div>
              <span style="font-weight: 600;">$${expressAir.toFixed(2)}</span>
            </label>
          </div>
        </div>
      `;
    }"""

if old_shipping_logic in content:
    content = content.replace(old_shipping_logic, new_shipping_logic)
else:
    print("WARNING: Could not find exact string to replace in rfq-controller.js. Trying regex.")
    content = re.sub(r'// Shipping calculation\s*let shippingCost.*?`\s*;\s*}', new_shipping_logic, content, flags=re.DOTALL)

with open('src/js/components/rfq-controller.js', 'w', encoding='utf-8') as f:
    f.write(content)

# We also need to map the selected region to a friendly name for the summary html
old_summary_logic = """        let summaryHtml = '';
        summaryHtml += `<span style="color:var(--color-steel-300);">${city}, ${prov} ${zip} <span style="color:var(--color-steel-500);">•</span> ${country}</span>`;
  
        if (shippingSummaryText) {
          shippingSummaryText.innerHTML = summaryHtml;
        }"""

new_summary_logic = """        let summaryHtml = '';
        let displayCountry = country;
        // Map region value to readable name
        const regionMap = {
          'north_america': 'North America',
          'europe': 'Europe',
          'oceania': 'Oceania / Australia',
          'asia': 'Asia',
          'rest_of_world': 'Rest of World'
        };
        if (regionMap[country]) displayCountry = regionMap[country];
        
        summaryHtml += `<span style="color:var(--color-steel-300);">${city}, ${prov} ${zip} <span style="color:var(--color-steel-500);">•</span> ${displayCountry}</span>`;
  
        if (shippingSummaryText) {
          shippingSummaryText.innerHTML = summaryHtml;
        }"""

if old_summary_logic in content:
    content = content.replace(old_summary_logic, new_summary_logic)
    with open('src/js/components/rfq-controller.js', 'w', encoding='utf-8') as f:
        f.write(content)
else:
    print("WARNING: Could not find summary HTML block.")

print("SUCCESS")
