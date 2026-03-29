/**
 * PRD — Profile Panel Component
 * Slide-in panel for viewing/editing user profile & logout
 */
import { getMyProfile, updateMyProfile } from '../services/profile.js';
import { logoutUser, getCurrentUser } from '../services/auth.js';

let _profile = null;
let _user = null;

export async function initProfilePanel() {
  // Inject HTML into body
  const panelHTML = `
    <div class="profile-overlay" id="profile-overlay"></div>
    <div class="profile-panel" id="profile-panel" role="dialog" aria-label="Profile Settings">

      <div class="profile-panel__header">
        <span style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.5);">Account Settings</span>
        <button class="profile-panel__close" id="profile-panel-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="profile-panel__avatar-section">
        <div class="profile-panel__avatar" id="profile-panel-avatar">?</div>
        <div class="profile-panel__identity">
          <h3 id="profile-panel-name">Loading...</h3>
          <p id="profile-panel-email">—</p>
        </div>
      </div>

      <div class="profile-panel__body">
        <p class="profile-section-title">Personal Information</p>
        <div class="profile-field-group">
          <div class="profile-inline">
            <div class="profile-field">
              <label for="pf-first">First Name</label>
              <input type="text" id="pf-first" placeholder="John">
            </div>
            <div class="profile-field">
              <label for="pf-last">Last Name</label>
              <input type="text" id="pf-last" placeholder="Doe">
            </div>
          </div>
          <div class="profile-field">
            <label for="pf-company">Company</label>
            <input type="text" id="pf-company" placeholder="Acme Corp">
          </div>
          <div class="profile-inline">
            <div class="profile-field">
              <label for="pf-jobtitle">Job Title</label>
              <input type="text" id="pf-jobtitle" placeholder="Product Engineer">
            </div>
            <div class="profile-field">
              <label for="pf-phone">Phone</label>
              <input type="tel" id="pf-phone" placeholder="+61 4xx xxx xxx">
            </div>
          </div>
          <div class="profile-inline">
            <div class="profile-field">
              <label for="pf-industry">Industry</label>
              <select id="pf-industry">
                <option value="">Select...</option>
                <option value="consumer_electronics">Consumer Electronics</option>
                <option value="medical_devices">Medical Devices</option>
                <option value="industrial">Industrial Equipment</option>
                <option value="automotive">Automotive</option>
                <option value="robotics">Robotics / Drones</option>
                <option value="home_appliances">Home Appliances</option>
                <option value="wearables">Wearables / IoT</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="profile-field">
              <label for="pf-country">Country</label>
              <input type="text" id="pf-country" placeholder="Australia">
            </div>
          </div>
        </div>

        <div class="profile-save-feedback" id="profile-save-feedback"></div>
        <button class="profile-save-btn" id="profile-save-btn">Save Changes</button>

        <div class="profile-danger-zone">
          <button class="profile-logout-btn" id="profile-logout-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Log Out
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', panelHTML);

  // Load profile data
  _user = await getCurrentUser();
  if (_user) {
    _profile = await getMyProfile();
    _populatePanel();
  }

  // Wire up events
  document.getElementById('profile-overlay').addEventListener('click', closeProfilePanel);
  document.getElementById('profile-panel-close').addEventListener('click', closeProfilePanel);

  document.getElementById('profile-save-btn').addEventListener('click', _handleSave);

  document.getElementById('profile-logout-btn').addEventListener('click', async () => {
    const btn = document.getElementById('profile-logout-btn');
    btn.textContent = 'Logging out...';
    btn.disabled = true;
    await logoutUser();
    window.location.href = '/index.html';
  });
}

function _populatePanel() {
  if (!_user) return;
  const p = _profile || {};
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || _user.email;
  const initial = (p.first_name || _user.email || '?')[0].toUpperCase();

  document.getElementById('profile-panel-avatar').textContent = initial;
  document.getElementById('profile-panel-name').textContent = name;
  document.getElementById('profile-panel-email').textContent = _user.email;

  _setVal('pf-first', p.first_name);
  _setVal('pf-last', p.last_name);
  _setVal('pf-company', p.company);
  _setVal('pf-jobtitle', p.job_title);
  _setVal('pf-phone', p.phone);
  _setVal('pf-country', p.country);
  const industryEl = document.getElementById('pf-industry');
  if (industryEl && p.industry) industryEl.value = p.industry;
}

function _setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val) el.value = val;
}

async function _handleSave() {
  const btn = document.getElementById('profile-save-btn');
  const feedback = document.getElementById('profile-save-feedback');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  feedback.textContent = '';
  feedback.className = 'profile-save-feedback';

  const updates = {
    first_name: document.getElementById('pf-first').value.trim(),
    last_name:  document.getElementById('pf-last').value.trim(),
    company:    document.getElementById('pf-company').value.trim(),
    job_title:  document.getElementById('pf-jobtitle').value.trim(),
    phone:      document.getElementById('pf-phone').value.trim(),
    industry:   document.getElementById('pf-industry').value,
    country:    document.getElementById('pf-country').value.trim(),
  };

  const { data, error } = await updateMyProfile(updates);

  btn.disabled = false;
  btn.textContent = 'Save Changes';

  if (error) {
    feedback.textContent = '✗ Failed to save. Please try again.';
    feedback.className = 'profile-save-feedback error';
  } else {
    _profile = data;
    feedback.textContent = '✓ Profile saved successfully';
    // Update nav avatar initial if name changed
    const newInitial = (updates.first_name || _user?.email || '?')[0].toUpperCase();
    const navAvatarEl = document.getElementById('nav-avatar') || document.getElementById('btn-login');
    if (navAvatarEl && navAvatarEl.tagName !== 'BUTTON') navAvatarEl.textContent = newInitial;
    setTimeout(() => { feedback.textContent = ''; }, 3000);
  }
}

export function openProfilePanel() {
  document.getElementById('profile-overlay')?.classList.add('active');
  document.getElementById('profile-panel')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeProfilePanel() {
  document.getElementById('profile-overlay')?.classList.remove('active');
  document.getElementById('profile-panel')?.classList.remove('active');
  document.body.style.overflow = '';
}
