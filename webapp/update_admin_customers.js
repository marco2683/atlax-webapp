import fs from 'fs';

const jsPath = 'src/js/admin.js';
let content = fs.readFileSync(jsPath, 'utf8');

// 1. Hook into initDashboard
const tabRegex = /if \(t === 'suppliers'\) \{ pageTitle.textContent = 'Suppliers CRM Directory';  renderSuppliersTable\(\); \}/;
if (content.match(tabRegex) && !content.includes("t === 'customers'")) {
    content = content.replace(tabRegex, `$&
        if (t === 'customers') { pageTitle.textContent = 'Customers Data CRM';       renderCustomersTable(); }`);
}

// 2. We need a state variable for loadedCustomers.
// Let's inject it into loadCRMData.
const loadRegex = /let loadedStaff = \[\];/;
if (content.match(loadRegex) && !content.includes('let loadedCustomers = []')) {
    content = content.replace(loadRegex, `$&
  let loadedCustomers = [];`);
}

// 3. Inject fetching profiles into loadCRMData
const fetchRegex = /const \{ data: staffData \} = await supabase.from\('staff'\).select\('\*'\);/;
if (content.match(fetchRegex) && !content.includes('supabase.from(\'profiles\')')) {
    content = content.replace(fetchRegex, `$&
      const { data: customerData } = await supabase.from('profiles').select('*');
      loadedCustomers = customerData || [];`);
}

// 4. Inject the `renderCustomersTable` implementation.
// We can append it at the end of the file or just before `// ─── Export if needed`
const exportRegex = /document\.addEventListener\('DOMContentLoaded'/;

const customerCRMCode = `
  // ═══════════════════════════════════════════════════════════
  //  C U S T O M E R S   C R M
  // ═══════════════════════════════════════════════════════════
  let adminCustomerFilters = {
    search: ''
  };

  function renderCustomersTable() {
    let filtered = loadedCustomers.filter(c => {
      let match = true;
      if (adminCustomerFilters.search) {
        const q = adminCustomerFilters.search.toLowerCase();
        match = (c.first_name || '').toLowerCase().includes(q) || 
                (c.last_name || '').toLowerCase().includes(q) || 
                (c.company || '').toLowerCase().includes(q) || 
                (c.email || '').toLowerCase().includes(q);
      }
      return match;
    });

    const rows = filtered.map(c => {
      const tier = c.tier || 'basic';
      const tierClass = tier.toLowerCase() === 'professional' ? 'tag-tier1' : tier.toLowerCase() === 'enterprise' ? 'tag-oem' : 'tag-tier2';
      const dateJoined = new Date(c.created_at || Date.now()).toLocaleDateString();

      return \`
      <tr>
        <td>
          <strong>\${c.first_name || ''} \${c.last_name || ''}</strong><br>
          <span style="font-size:12px; color:var(--color-steel-400);">\${c.email || '—'}</span>
        </td>
        <td>\${c.company || '—'}</td>
        <td>\${c.job_title || '—'}</td>
        <td><span class="tag-segment \${tierClass}" style="text-transform: capitalize;">\${tier}</span></td>
        <td>\${dateJoined}</td>
        <td class="admin-table-actions">
          <button class="admin-action-btn admin-view-customer" data-id="\${c.id}">Manage User</button>
        </td>
      </tr>\`;
    }).join('');

    const tableHTML = \`
        <div class="admin-toolbar glass-panel">
          <div class="admin-toolbar-search">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="admin-cust-search" placeholder="Search customers by name, company, email..." value="\${adminCustomerFilters.search}">
          </div>
          <button class="btn btn-secondary" onclick="alert('Feature coming soon: Export billing history')">Export Billing</button>
        </div>

        <div class="admin-table-container glass-panel">
          <table class="admin-table">
            <thead><tr>
              <th>Customer</th>
              <th>Company</th>
              <th>Job Title</th>
              <th>Account Tier</th>
              <th>Join Date</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>\${rows || '<tr><td colspan="6" style="text-align:center;padding:40px;">No customers found.</td></tr>'}</tbody>
          </table>
        </div>
    \`;
    
    contentRouting.innerHTML = tableHTML;

    // Handlers
    document.getElementById('admin-cust-search')?.addEventListener('input', e => {
      adminCustomerFilters.search = e.target.value;
      renderCustomersTable();
      const input = document.getElementById('admin-cust-search');
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    });

    document.querySelectorAll('.admin-view-customer').forEach(btn => {
      btn.addEventListener('click', () => openCustomerModal(btn.dataset.id));
    });
  }

  async function openCustomerModal(id) {
    const cust = loadedCustomers.find(c => c.id === id);
    if (!cust) return;

    // Fetch their RFQ history simply to show activity stats
    let rfqCount = 0;
    try {
      const { count } = await supabase.from('rfq_history').select('*', { count: 'exact', head: true }).eq('user_id', id);
      rfqCount = count || 0;
    } catch(e) {}

    const modalHTML = \`
      <div id="admin-cust-modal" class="admin-modal-overlay">
        <div class="admin-modal-content" style="max-width: 600px;">
          <header class="admin-modal-header">
            <h3>Manage Customer: \${cust.first_name || ''} \${cust.last_name || ''}</h3>
            <button class="admin-modal-close" onclick="document.getElementById('admin-cust-modal').remove()">×</button>
          </header>
          
          <div class="admin-modal-body" style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Profile Info -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: rgba(0,0,0,0.1); padding: 16px; border-radius: 8px;">
              <div><strong>Email:</strong> <span style="color:var(--color-slate-400);">\${cust.email || '—'}</span></div>
              <div><strong>Company:</strong> <span style="color:var(--color-slate-400);">\${cust.company || '—'}</span></div>
              <div><strong>Phone:</strong> <span style="color:var(--color-slate-400);">\${cust.phone || '—'}</span></div>
              <div><strong>Job Title:</strong> <span style="color:var(--color-slate-400);">\${cust.job_title || '—'}</span></div>
            </div>

            <!-- Activity -->
            <div style="border-left: 3px solid var(--color-emerald); padding-left: 16px;">
              <h4 style="margin-bottom: 8px; color: #fff;">Account Activity</h4>
              <p style="color: var(--color-slate-400); font-size: 14px;">This user has generated <strong>\${rfqCount}</strong> RFQs/quotes in the system.</p>
            </div>

             <!-- Subscription Tier Management -->
            <div class="admin-form-group">
              <label>Subscription Tier Allocation</label>
              <select id="cust-tier-select" class="admin-input">
                <option value="basic" \${cust.tier === 'basic' || !cust.tier ? 'selected' : ''}>Basic (Free)</option>
                <option value="professional" \${cust.tier === 'professional' ? 'selected' : ''}>Professional ($49/mo)</option>
                <option value="enterprise" \${cust.tier === 'enterprise' ? 'selected' : ''}>Enterprise (Custom)</option>
              </select>
              <small style="color:var(--color-slate-400); display:block; margin-top:8px;">Modifying this will instantly restrict or grant access to the Supplier Globe and Product Builder tools on the user's end.</small>
            </div>

            <!-- Internal Notes / Billing History Mockup -->
            <div class="admin-form-group">
              <label>Billing & Admin Notes</label>
              <textarea id="cust-admin-notes" class="admin-input" rows="3" placeholder="Enter manual billing refs, stripe ids, or notes..."></textarea>
              <small style="color:var(--color-slate-400); display:block; margin-top:8px;">These notes are only visible to SysAdmins.</small>
            </div>

          </div>
          
          <footer class="admin-modal-footer" style="justify-content: space-between;">
            <button class="btn btn-secondary" style="color: #ef4444; border-color: rgba(239,68,68,0.3);" onclick="if(confirm('Suspend account? User will not be able to log in.')){ alert('Account suspended'); document.getElementById('admin-cust-modal').remove(); }">Suspend Account</button>
            <div style="display:flex; gap:12px;">
              <button class="btn btn-secondary" onclick="document.getElementById('admin-cust-modal').remove()">Cancel</button>
              <button class="btn btn-primary" id="cust-save-btn">Save Changes</button>
            </div>
          </footer>
        </div>
      </div>
    \`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('cust-save-btn')?.addEventListener('click', async (e) => {
      const btn = e.target;
      const originalText = btn.textContent;
      btn.textContent = 'Saving...';
      const newTier = document.getElementById('cust-tier-select').value;
      
      const { error } = await supabase.from('profiles').update({ tier: newTier }).eq('id', id);
      
      if(error) {
        console.error(error);
        alert('Failed to update customer tier.');
        btn.textContent = originalText;
      } else {
        cust.tier = newTier;
        btn.textContent = 'Saved!';
        renderCustomersTable(); // Refresh the table behind modal
        setTimeout(() => document.getElementById('admin-cust-modal')?.remove(), 800);
      }
    });
  }

`;

// Insert just before "document.addEventListener('DOMContentLoaded', () => {" to keep it global
if (!content.includes('C U S T O M E R S   C R M')) {
  // It's safer to put it inside the DOMContentLoaded wrap just like the other render functions.
  // Actually, in admin.js, everything is inside DOMContentLoaded.
  // I will inject it at the very bottom right before the last closing brace of DOMContentLoaded.
  
  const endOfDomAuthRegex = /\/\/ ─── Available Tech Groups \& Technologies/; 
  // Let's just find the `renderStaffTable` and inject right before it.
  const staffRegex = /\/\/ ═══════════════════════════════════════════════════════════\s*\n\s*\/\/  S T A F F   T A B L E/;
  if (content.match(staffRegex)) {
      content = content.replace(staffRegex, customerCRMCode + `\n  $&`);
      fs.writeFileSync(jsPath, content, 'utf8');
      console.log('Customers CRM injected in admin.js');
  }
} else {
  console.log('Customers CRM already injected');
}

// 5. One more patch for `.row-disabled` fallback if needed
// Actually CSS is fine.

