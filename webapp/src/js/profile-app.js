import { getMyProfile, updateMyProfile } from './services/profile.js';
import { supabase } from './utils/supabaseClient.js';
import { logoutUser } from './services/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth state
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/auth.html';
    return;
  }

  // Load User Data
  const emailInput = document.getElementById('prof-email');
  emailInput.value = session.user.email;

  const profile = await getMyProfile();
  if (profile) {
    document.getElementById('prof-first').value = profile.first_name || '';
    document.getElementById('prof-last').value = profile.last_name || '';
    document.getElementById('prof-phone').value = profile.phone || '';
    document.getElementById('prof-company').value = profile.company || '';
    document.getElementById('prof-title').value = profile.job_title || '';
    document.getElementById('prof-address').value = profile.address || '';
    document.getElementById('prof-age').value = profile.age || '';
    document.getElementById('prof-gender').value = profile.gender || '';

    // Billing info
    const isPro = profile.tier === 'professional';
    document.getElementById('billing-tier-name').textContent = isPro ? 'Professional Tier' : 'Basic Tier';
    const badge = document.getElementById('billing-tier-badge');
    badge.textContent = isPro ? 'PRO' : 'BASIC';
    if (isPro) badge.classList.add('professional');
  }

  // Tab switching logic
  const tabs = document.querySelectorAll('.profile-tab');
  const panes = document.querySelectorAll('.profile-content-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      const target = tab.getAttribute('data-tab');
      
      // Handle logout pseudo-tab
      if (tab.textContent === 'Log Out') {
        await logoutUser();
        window.location.href = '/';
        return;
      }

      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`pane-${target}`).classList.add('active');
    });
  });

  // Handle Form Submission
  const form = document.getElementById('profile-general-form');
  const saveBtn = document.getElementById('prof-save-btn');
  const saveMsg = document.getElementById('prof-save-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    const updates = {
      first_name: document.getElementById('prof-first').value,
      last_name: document.getElementById('prof-last').value,
      phone: document.getElementById('prof-phone').value,
      company: document.getElementById('prof-company').value,
      job_title: document.getElementById('prof-title').value,
      address: document.getElementById('prof-address').value,
      age: document.getElementById('prof-age').value ? parseInt(document.getElementById('prof-age').value) : null,
      gender: document.getElementById('prof-gender').value
    };

    const { error } = await updateMyProfile(updates);

    if (!error) {
      saveBtn.textContent = 'Save Changes';
      saveBtn.disabled = false;
      saveMsg.style.display = 'inline-block';
      setTimeout(() => saveMsg.style.display = 'none', 3000);
    } else {
      alert('Error updating profile: ' + error.message);
      saveBtn.textContent = 'Save Changes';
      saveBtn.disabled = false;
    }
  });

  // Stripe Integration Triggers
  document.getElementById('btn-upgrade').addEventListener('click', async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("You must be logged in.");

      document.getElementById('btn-upgrade').textContent = 'Loading...';
      
      const response = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Checkout API Error: ' + JSON.stringify(data));
        btn.textContent = originalText;
        btn.disabled = false;
      }
    } catch (err) {
      alert('Network/Fetch Error: ' + err.message);
      btn.textContent = 'Upgrade to Professional';
      btn.disabled = false;
    }
  });

  document.getElementById('btn-customer-portal').addEventListener('click', async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("You must be logged in.");

      const btn = document.getElementById('btn-customer-portal');
      btn.textContent = 'Loading Portal...';
      
      const response = await fetch('/.netlify/functions/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to initialize customer portal');
      }
    } catch (err) {
      console.error(err);
      alert('Network error initializing portal.');
    } finally {
      document.getElementById('btn-customer-portal').textContent = 'Open Stripe Portal';
    }
  });
});
