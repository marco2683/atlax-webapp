import re

with open('src/js/admin-pricing.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add HTML for the section
old_html = """        <!-- ═══ 3. MANUFACTURING COSTS ═══ -->
        ${section('mfg-costs', 'Manufacturing Costs', '🏭', '#22c55e', `
          <div id="mc-sliders"></div>
        `, true)}

        <button id="sim-publish-btn" class="btn btn-primary\""""

new_html = """        <!-- ═══ 3. MANUFACTURING COSTS ═══ -->
        ${section('mfg-costs', 'Manufacturing Costs', '🏭', '#22c55e', `
          <div id="mc-sliders"></div>
        `, true)}

        <!-- ═══ 4. LOGISTICS & SHIPPING ═══ -->
        ${section('shipping-costs', 'Logistics & Shipping', '🚢', '#3b82f6', `
          <div id="sc-sliders"></div>
        `, false)}

        <button id="sim-publish-btn" class="btn btn-primary\""""

content = content.replace(old_html, new_html)

# 2. Add the renderShippingCosts function
shipping_func = """
  // ═══════════════════════════════════════════════════════
  // SECTION 4 — LOGISTICS & SHIPPING
  // ═══════════════════════════════════════════════════════
  function renderShippingCosts() {
    const sc = document.getElementById('sc-sliders');
    if (!sc) return;
    sc.innerHTML = '';
    const regions = PRICING_CONFIG.globalSettings.shipping?.regions;
    if (!regions) return;

    const sSty = { color: '#93c5fd', bg: 'rgba(59,130,246,0.04)', border: 'rgba(59,130,246,0.15)' };

    // Create a region selector to avoid cluttering the UI
    const selDiv = document.createElement('div');
    selDiv.style.marginBottom = '12px';
    selDiv.innerHTML = `
      <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Select Region to Edit</label>
      <select id="sc-region-select" class="form-select">
        ${Object.entries(regions).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
      </select>
    `;
    sc.appendChild(selDiv);

    const ratesContainer = document.createElement('div');
    sc.appendChild(ratesContainer);

    function renderRegionRates(regionKey) {
      ratesContainer.innerHTML = '';
      const r = regions[regionKey];
      
      ['seaFreight', 'economyAir', 'expressAir'].forEach(mode => {
        let title = mode === 'seaFreight' ? 'Sea Freight' : (mode === 'economyAir' ? 'Economy Air' : 'Express Air');
        ratesContainer.insertAdjacentHTML('beforeend', subHeader(title, '#60a5fa'));
        
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:8px;';
        
        makeSlider(grid, 'Base Fee ($)', r[mode], 'base', 0, 500, 5, { ...sSty, unit: '' });
        makeSlider(grid, 'Cost per Kg ($)', r[mode], 'perKg', 0.5, 50, 0.5, { ...sSty, unit: '' });
        
        ratesContainer.appendChild(grid);
        
        // Days input (text)
        const daysDiv = document.createElement('div');
        daysDiv.style.cssText = `background:${sSty.bg}; padding:6px 10px; border-radius:6px; border:1px solid ${sSty.border}; margin-bottom: 12px;`;
        daysDiv.innerHTML = `
          <label style="font-size:9px; color:${sSty.color}; font-family:monospace;">Transit Days (e.g. 8-12)</label>
          <input type="text" class="sc-days-input" value="${r[mode].days}" 
                 style="width:100%; margin-top:4px; padding:4px 6px; font-size:11px; background:rgba(0,0,0,0.25); border:1px solid ${sSty.border}; color:${sSty.color}; border-radius:4px;">
        `;
        ratesContainer.appendChild(daysDiv);
        
        daysDiv.querySelector('input').addEventListener('change', (e) => {
          r[mode].days = e.target.value;
        });
      });
    }

    const regSelect = document.getElementById('sc-region-select');
    regSelect.addEventListener('change', (e) => {
      renderRegionRates(e.target.value);
    });
    
    // Initial render
    renderRegionRates(regSelect.value);
  }
"""

# Insert renderShippingCosts before the CHART INIT
content = content.replace("  // ═══════════════════════════════════════════════════════\n  // CHART INIT", shipping_func + "\n  // ═══════════════════════════════════════════════════════\n  // CHART INIT")

# 3. Call renderShippingCosts in INIT
content = content.replace("  renderPricingRules();\n  renderMfgCosts();\n  updateChart();", "  renderPricingRules();\n  renderMfgCosts();\n  renderShippingCosts();\n  updateChart();")

with open('src/js/admin-pricing.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
