import { supabase } from './supabase.js';
import { getCurrentUser, logoutUser, loginUser, signUpUser } from './services/auth.js';
import { launchOnboardingWizard } from './supplier-onboarding.js';

let currentUser = null;
let factoryRecord = null;
let categories = [];
let categoryParameters = [];
let myProducts = [];
let currentLang = 'en';

const i18nDict = {
  disconnect: { en: "Logout", zh: "登出" }
};

export function translateDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (i18nDict[key] && i18nDict[key][currentLang]) {
      el.textContent = i18nDict[key][currentLang];
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const loadingUi = document.getElementById('supplier-loading');
  const onboardingUi = document.getElementById('supplier-onboarding');
  const appUi = document.getElementById('supplier-app');
  
  document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    translateDOM();
  });
  
  currentUser = await getCurrentUser();
  if (!currentUser) {
    // Show inline auth UI instead of redirecting away
    loadingUi.style.display = 'none';
    showSupplierAuthScreen();
    return;
  }

  const { data: factories, error } = await supabase.from('oem_sellers').select('*').eq('owner_user_id', currentUser.id);
  
  if (error || !factories || factories.length === 0) {
    // No supplier record — launch full onboarding wizard
    loadingUi.style.display = 'none';
    launchOnboardingWizard(currentUser, null);
    return;
  }

  factoryRecord = factories[0];

  // All suppliers with a record proceed to the dashboard.
  // Incomplete onboarding shows a warning banner inside the dashboard.
  bootApp();
});

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER SELF-SERVICE AUTH (Login / Register)
// Shown when no session exists — suppliers don't need to leave this page
// ─────────────────────────────────────────────────────────────────────────────
function showSupplierAuthScreen() {
  const onboardingUi = document.getElementById('supplier-onboarding');
  const appUi        = document.getElementById('supplier-app');

  // ── i18n dictionary for seller auth ──
  let _authLang = 'en';
  const _authI18n = {
    // Header
    subtitle:         { en: 'Seller Platform · 卖家平台', zh: '卖家平台 · Seller Platform' },
    langBtn:          { en: '中文',                       zh: 'English' },
    // Tabs
    tabLogin:         { en: 'Sign In',                    zh: '登录' },
    tabRegister:      { en: 'Create Account',             zh: '创建账号' },
    // Login form
    loginTitle:       { en: 'Welcome back',               zh: '欢迎回来' },
    loginSubtitle:    { en: 'Sign in to access your seller dashboard.', zh: '登录以访问您的卖家控制面板。' },
    loginEmailLabel:  { en: 'Email address',              zh: '电子邮箱' },
    loginEmailPh:     { en: 'you@company.com',            zh: '你的邮箱@company.com' },
    loginPwdLabel:    { en: 'Password',                   zh: '密码' },
    loginPwdPh:       { en: '••••••••',                   zh: '••••••••' },
    loginBtn:         { en: 'Sign In to Seller Central',  zh: '登录卖家中心' },
    loginNoAccount:   { en: "Don't have an account?",     zh: '还没有账号？' },
    loginRegLink:     { en: 'Register here',              zh: '点此注册' },
    // Register form
    regTitle:         { en: 'Create your seller account',                  zh: '创建您的卖家账号' },
    regSubtitle:      { en: 'Join the AtlasDT B2B marketplace as a verified supplier.', zh: '加入AtlasDT B2B平台，成为认证供应商。' },
    regNameLabel:     { en: 'Full name',                  zh: '姓名' },
    regNamePh:        { en: 'Zhang Wei',                  zh: '张伟' },
    regEmailLabel:    { en: 'Work email',                 zh: '工作邮箱' },
    regEmailPh:       { en: 'you@factory.com',            zh: '你的邮箱@factory.com' },
    regPwdLabel:      { en: 'Password',                   zh: '密码' },
    regPwdHint:       { en: '(min. 8 characters)',        zh: '（至少8个字符）' },
    regPwdPh:         { en: '••••••••',                   zh: '••••••••' },
    regCompanyLabel:  { en: 'Company name',               zh: '公司名称' },
    regCompanyPh:     { en: 'Shenzhen Precision Manufacturing Ltd.', zh: '深圳精密制造有限公司' },
    regBtn:           { en: 'Create Account & Continue',  zh: '创建账号并继续' },
    regHasAccount:    { en: 'Already registered?',        zh: '已有账号？' },
    regSignInLink:    { en: 'Sign in',                    zh: '立即登录' },
    // Footer
    tosFooter:        { en: 'By continuing you agree to the AtlasDT Platform Terms of Service.', zh: '继续即表示您同意AtlasDT平台服务条款。' },
  };

  function _t(key) { return _authI18n[key]?.[_authLang] || _authI18n[key]?.en || key; }

  // Replace the onboarding panel with the auth screen
  document.body.innerHTML = `
    <div style="min-height:100vh; background:linear-gradient(135deg,#0c1a2e 0%,#0e2640 50%,#0a1628 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Open Sans',sans-serif;">

      <!-- Logo -->
      <div style="margin-bottom:40px; text-align:center;">
        <img src="/logos/atlasdt-logo-light.png" alt="AtlasDT" style="height:44px; margin-bottom:12px;">
        <div id="sp-auth-subtitle" style="color:rgba(255,255,255,0.6); font-size:13px; letter-spacing:2px; text-transform:uppercase;">Seller Platform · 卖家平台</div>
      </div>

      <!-- Language Toggle -->
      <button id="sp-auth-lang-toggle" style="position:absolute; top:24px; right:32px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:rgba(255,255,255,0.8); padding:6px 16px; border-radius:20px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; backdrop-filter:blur(8px); transition:all 0.2s ease; letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <span id="sp-lang-label">中文</span>
      </button>

      <!-- Card -->
      <div style="background:#fff; border-radius:8px; box-shadow:0 24px 64px rgba(0,0,0,0.4); width:100%; max-width:440px; overflow:hidden;">

        <!-- Tab switcher -->
        <div id="auth-tabs" style="display:flex; border-bottom:1px solid #e2e8f0;">
          <button id="tab-login" onclick="window._authTab('login')" style="flex:1; padding:16px; background:#fff; border:none; font-weight:700; font-size:14px; color:#007185; cursor:pointer; border-bottom:3px solid #007185; font-family:inherit;" data-sp-i18n="tabLogin">Sign In</button>
          <button id="tab-register" onclick="window._authTab('register')" style="flex:1; padding:16px; background:#f8fafc; border:none; font-weight:600; font-size:14px; color:#64748b; cursor:pointer; border-bottom:3px solid transparent; font-family:inherit;" data-sp-i18n="tabRegister">Create Account</button>
        </div>

        <div id="auth-body" style="padding:32px;">

          <!-- Login Form -->
          <div id="auth-login">
            <h2 style="margin:0 0 4px 0; font-size:20px; font-weight:700; color:#0f172a;" data-sp-i18n="loginTitle">Welcome back</h2>
            <p style="margin:0 0 24px 0; font-size:13px; color:#64748b;" data-sp-i18n="loginSubtitle">Sign in to access your seller dashboard.</p>
            <div id="auth-login-err" style="display:none; background:#fef2f2; border:1px solid #fecaca; border-radius:4px; padding:10px 14px; font-size:13px; color:#dc2626; margin-bottom:16px;"></div>
            <label style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#374151;" data-sp-i18n="loginEmailLabel">Email address</label>
            <input type="email" id="login-email" placeholder="you@company.com" data-sp-i18n-ph="loginEmailPh" style="width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:4px; font-size:14px; margin-bottom:16px; box-sizing:border-box; font-family:inherit;">
            <label style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#374151;" data-sp-i18n="loginPwdLabel">Password</label>
            <input type="password" id="login-password" placeholder="••••••••" data-sp-i18n-ph="loginPwdPh" style="width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:4px; font-size:14px; margin-bottom:24px; box-sizing:border-box; font-family:inherit;">
            <button id="btn-login" onclick="window._doLogin()" style="width:100%; padding:12px; background:#007185; color:#fff; border:none; border-radius:4px; font-size:15px; font-weight:700; cursor:pointer; font-family:inherit;" data-sp-i18n="loginBtn">Sign In to Seller Central</button>
            <p style="text-align:center; margin:16px 0 0 0; font-size:12px; color:#64748b;">
              <span data-sp-i18n="loginNoAccount">Don't have an account?</span> <a href="#" onclick="window._authTab('register'); return false;" style="color:#007185; font-weight:700;" data-sp-i18n="loginRegLink">Register here</a>
            </p>
          </div>

          <!-- Register Form -->
          <div id="auth-register" style="display:none;">
            <h2 style="margin:0 0 4px 0; font-size:20px; font-weight:700; color:#0f172a;" data-sp-i18n="regTitle">Create your seller account</h2>
            <p style="margin:0 0 24px 0; font-size:13px; color:#64748b;" data-sp-i18n="regSubtitle">Join the AtlasDT B2B marketplace as a verified supplier.</p>
            <div id="auth-reg-err" style="display:none; background:#fef2f2; border:1px solid #fecaca; border-radius:4px; padding:10px 14px; font-size:13px; color:#dc2626; margin-bottom:16px;"></div>
            <div id="auth-reg-ok"  style="display:none; background:#f0fdf4; border:1px solid #86efac; border-radius:4px; padding:10px 14px; font-size:13px; color:#16a34a; margin-bottom:16px;"></div>
            <label style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#374151;" data-sp-i18n="regNameLabel">Full name</label>
            <input type="text" id="reg-name" placeholder="Zhang Wei" data-sp-i18n-ph="regNamePh" style="width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:4px; font-size:14px; margin-bottom:16px; box-sizing:border-box; font-family:inherit;">
            <label style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#374151;" data-sp-i18n="regEmailLabel">Work email</label>
            <input type="email" id="reg-email" placeholder="you@factory.com" data-sp-i18n-ph="regEmailPh" style="width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:4px; font-size:14px; margin-bottom:16px; box-sizing:border-box; font-family:inherit;">
            <label id="reg-pwd-label" style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#374151;">Password <span style="color:#9ca3af; font-weight:400;" data-sp-i18n="regPwdHint">(min. 8 characters)</span></label>
            <input type="password" id="reg-password" placeholder="••••••••" data-sp-i18n-ph="regPwdPh" style="width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:4px; font-size:14px; margin-bottom:16px; box-sizing:border-box; font-family:inherit;">
            <label style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#374151;" data-sp-i18n="regCompanyLabel">Company name</label>
            <input type="text" id="reg-company" placeholder="Shenzhen Precision Manufacturing Ltd." data-sp-i18n-ph="regCompanyPh" style="width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:4px; font-size:14px; margin-bottom:24px; box-sizing:border-box; font-family:inherit;">
            <button id="btn-register" onclick="window._doRegister()" style="width:100%; padding:12px; background:#f59e0b; color:#fff; border:none; border-radius:4px; font-size:15px; font-weight:700; cursor:pointer; font-family:inherit;" data-sp-i18n="regBtn">Create Account & Continue</button>
            <p style="text-align:center; margin:16px 0 0 0; font-size:12px; color:#64748b;">
              <span data-sp-i18n="regHasAccount">Already registered?</span> <a href="#" onclick="window._authTab('login'); return false;" style="color:#007185; font-weight:700;" data-sp-i18n="regSignInLink">Sign in</a>
            </p>
          </div>

        </div>
      </div>

      <p style="margin-top:24px; font-size:12px; color:rgba(255,255,255,0.4);" data-sp-i18n="tosFooter">
        By continuing you agree to the AtlasDT Platform Terms of Service.
      </p>
    </div>
  `;

  // ── i18n DOM updater ──
  function _applyAuthLang() {
    // Text content
    document.querySelectorAll('[data-sp-i18n]').forEach(el => {
      const key = el.dataset.spI18n;
      if (_authI18n[key]?.[_authLang]) el.textContent = _authI18n[key][_authLang];
    });
    // Placeholders
    document.querySelectorAll('[data-sp-i18n-ph]').forEach(el => {
      const key = el.dataset.spI18nPh;
      if (_authI18n[key]?.[_authLang]) el.placeholder = _authI18n[key][_authLang];
    });
    // Special: password label with inner span
    const pwdLabel = document.getElementById('reg-pwd-label');
    if (pwdLabel) {
      const hintSpan = pwdLabel.querySelector('[data-sp-i18n="regPwdHint"]');
      pwdLabel.childNodes[0].textContent = _t('regPwdLabel') + ' ';
      if (hintSpan) hintSpan.textContent = _t('regPwdHint');
    }
    // Subtitle & toggle label
    const subtitle = document.getElementById('sp-auth-subtitle');
    if (subtitle) subtitle.textContent = _t('subtitle');
    const langLabel = document.getElementById('sp-lang-label');
    if (langLabel) langLabel.textContent = _t('langBtn');
  }

  // ── Language toggle handler ──
  document.getElementById('sp-auth-lang-toggle')?.addEventListener('click', () => {
    _authLang = _authLang === 'en' ? 'zh' : 'en';
    _applyAuthLang();
  });

  // ── Tab switcher ────────────────────────────────────────────────────────────
  window._authTab = function(tab) {
    const isLogin = tab === 'login';
    document.getElementById('auth-login').style.display    = isLogin ? '' : 'none';
    document.getElementById('auth-register').style.display = isLogin ? 'none' : '';
    document.getElementById('tab-login').style.color       = isLogin ? '#007185' : '#64748b';
    document.getElementById('tab-login').style.fontWeight  = isLogin ? '700' : '600';
    document.getElementById('tab-login').style.borderBottom= isLogin ? '3px solid #007185' : '3px solid transparent';
    document.getElementById('tab-login').style.background  = isLogin ? '#fff' : '#f8fafc';
    document.getElementById('tab-register').style.color       = !isLogin ? '#007185' : '#64748b';
    document.getElementById('tab-register').style.fontWeight  = !isLogin ? '700' : '600';
    document.getElementById('tab-register').style.borderBottom= !isLogin ? '3px solid #007185' : '3px solid transparent';
    document.getElementById('tab-register').style.background  = !isLogin ? '#fff' : '#f8fafc';
  };

  // ── Login handler ───────────────────────────────────────────────────────────
  window._doLogin = async function() {
    const btn   = document.getElementById('btn-login');
    const errEl = document.getElementById('auth-login-err');
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;

    if (!email || !pass) { errEl.textContent = _authLang === 'zh' ? '请输入邮箱和密码。' : 'Please enter your email and password.'; errEl.style.display=''; return; }

    btn.textContent = _authLang === 'zh' ? '正在登录...' : 'Signing in...';
    btn.disabled = true;
    errEl.style.display = 'none';

    const { data, error } = await loginUser(email, pass);
    if (error) {
      errEl.textContent = error.message || (_authLang === 'zh' ? '登录失败，请检查您的凭据。' : 'Login failed. Check your credentials.');
      errEl.style.display = '';
      btn.textContent = _t('loginBtn');
      btn.disabled = false;
    } else {
      // Reload the page — DOMContentLoaded will re-run with the session now set
      window.location.reload();
    }
  };

  // ── Register handler ────────────────────────────────────────────────────────
  window._doRegister = async function() {
    const btn     = document.getElementById('btn-register');
    const errEl   = document.getElementById('auth-reg-err');
    const okEl    = document.getElementById('auth-reg-ok');
    const name    = document.getElementById('reg-name').value.trim();
    const email   = document.getElementById('reg-email').value.trim();
    const pass    = document.getElementById('reg-password').value;
    const company = document.getElementById('reg-company').value.trim();

    errEl.style.display = 'none';
    okEl.style.display  = 'none';

    if (!name || !email || !pass || !company) {
      errEl.textContent = _authLang === 'zh' ? '请填写所有字段。' : 'Please fill in all fields.'; errEl.style.display=''; return;
    }
    if (pass.length < 8) {
      errEl.textContent = _authLang === 'zh' ? '密码至少需要8个字符。' : 'Password must be at least 8 characters.'; errEl.style.display=''; return;
    }

    btn.textContent = _authLang === 'zh' ? '正在创建账号...' : 'Creating account...';
    btn.disabled = true;

    try {
      const { data, error } = await signUpUser(email, pass, { full_name: name, company, _redirectTo: '/supplier-dashboard.html' });
      if (error) {
        errEl.textContent = error.message || (_authLang === 'zh' ? '注册失败，请重试。' : 'Registration failed. Please try again.');
        errEl.style.display = '';
        btn.textContent = _t('regBtn');
        btn.disabled = false;
      } else {
        // Email confirmation is enabled — always show "check your email"
        okEl.innerHTML = _authLang === 'zh'
          ? `<strong>✅ 账号已创建！</strong><br>请查看 <strong>${email}</strong> 的确认邮件，点击链接后即可登录。`
          : `<strong>✅ Account created!</strong><br>Please check <strong>${email}</strong> for a confirmation email. Click the link to verify, then return here and sign in.`;
        okEl.style.display = '';
        btn.textContent = _authLang === 'zh' ? '✅ 账号已创建 — 请查看邮箱' : '✅ Account Created — Check your email';
        btn.disabled = true;
      }
    } catch(e) {
      console.error('Signup handler error:', e);
      errEl.textContent = e.message || 'An unexpected error occurred.';
      errEl.style.display = '';
      btn.textContent = _t('regBtn');
      btn.disabled = false;
    }
  };

  // Allow Enter key on inputs
  setTimeout(() => {
    ['login-email','login-password'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => { if(e.key==='Enter') window._doLogin(); });
    });
    ['reg-name','reg-email','reg-password','reg-company'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => { if(e.key==='Enter') window._doRegister(); });
    });
  }, 100);
}

// bindOnboarding — replaced by supplier-onboarding.js wizard module

async function bootApp() {
  document.getElementById('supplier-loading').style.display = 'none';
  document.getElementById('supplier-app').style.display = 'flex';

  document.getElementById('sidebar-factory-name').textContent = factoryRecord.name || 'My Factory';

  // Avatar initials
  const avatarEl = document.getElementById('sp-avatar-initials');
  if (avatarEl && factoryRecord.name) {
    const words = factoryRecord.name.split(' ');
    avatarEl.textContent = (words[0]?.[0] || '') + (words[1]?.[0] || '');
  }

  document.getElementById('supplier-logout-btn').addEventListener('click', async () => {
    await logoutUser();
  });

  const [catRes, paramRes] = await Promise.all([
    supabase.from('component_categories').select('*').order('name'),
    supabase.from('category_parameters').select('*')
  ]);
  categories = catRes.data || [];
  categoryParameters = paramRes.data || [];

  // ── Incomplete onboarding warning banner ──
  if (!factoryRecord.onboarding_completed) {
    const banner = document.createElement('div');
    banner.id = 'onboarding-warning-banner';
    banner.style.cssText = 'background:linear-gradient(90deg,#f59e0b,#d97706);color:#1a1a2e;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:600;z-index:100;flex-shrink:0;';
    banner.innerHTML = `
      <span>⚠️ Your company profile is incomplete. You cannot publish products on the marketplace until onboarding is finished.</span>
      <button id="banner-complete-btn" style="background:#1a1a2e;color:#f59e0b;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;white-space:nowrap;margin-left:16px;">Complete Profile →</button>
    `;
    const appEl = document.getElementById('supplier-app');
    appEl.insertBefore(banner, appEl.firstChild);
    banner.querySelector('#banner-complete-btn').addEventListener('click', () => {
      launchOnboardingWizard(currentUser, factoryRecord);
    });
  }

  // Nav link helpers
  const navLinks = document.querySelectorAll('.sp-nav-link');
  function setActiveNav(id) {
    navLinks.forEach(l => l.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
  }

  // Theme toggle
  const savedTheme = localStorage.getItem('sp-theme');
  if (savedTheme === 'light') document.body.classList.add('sp-light');
  const themeBtn = document.getElementById('sp-theme-toggle');
  function updateThemeIcon() {
    if (themeBtn) themeBtn.textContent = document.body.classList.contains('sp-light') ? '🌙' : '☀️';
  }
  updateThemeIcon();
  themeBtn?.addEventListener('click', () => {
    document.body.classList.toggle('sp-light');
    localStorage.setItem('sp-theme', document.body.classList.contains('sp-light') ? 'light' : 'dark');
    updateThemeIcon();
  });

  document.getElementById('nav-dashboard')?.addEventListener('click', () => { setActiveNav('nav-dashboard'); loadDashboardTab(); });
  document.getElementById('nav-inventory')?.addEventListener('click', () => { setActiveNav('nav-inventory'); loadCatalogTab(); });
  document.getElementById('nav-orders')?.addEventListener('click', () => { setActiveNav('nav-orders'); loadOrdersTab(); });
  document.getElementById('nav-publish')?.addEventListener('click', () => {
    if (!factoryRecord.onboarding_completed) {
      alert('Please complete your company profile before publishing products.');
      return;
    }
    setActiveNav('nav-publish'); renderCreateProductForm();
  });
  document.getElementById('nav-profile')?.addEventListener('click', () => {
    launchOnboardingWizard(currentUser, factoryRecord);
  });
  document.getElementById('nav-team')?.addEventListener('click', () => { setActiveNav('nav-team'); loadTeamTab(); });

  // Default: Dashboard
  loadDashboardTab();
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: TEAM MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
async function loadTeamTab() {
  const routing = document.getElementById('supplier-content-routing');

  // Load existing team members
  const { data: members, error } = await supabase
    .from('supplier_team_members')
    .select('*')
    .eq('supplier_id', factoryRecord.id)
    .order('invited_at', { ascending: false });

  const teamData = members || [];
  const roleLabels = { admin: 'Admin', sales: 'Sales', operations: 'Operations', viewer: 'Viewer' };
  const statusColors = { pending: '#f59e0b', active: '#10b981', suspended: '#ef4444' };

  routing.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:32px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
        <div>
          <h1 class="sp-page-title" style="margin:0;">Team Members</h1>
          <p style="color:#94A3B8;font-size:14px;margin:4px 0 0;">Manage access for your team. Members will receive an email invitation.</p>
        </div>
        <button id="btn-add-member" style="background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Invite Member
        </button>
      </div>

      <!-- Add member form (hidden by default) -->
      <div id="team-add-form" style="display:none;background:var(--sp-bg-raised,#111827);border:1px solid rgba(148,163,184,0.12);border-radius:12px;padding:24px;margin-bottom:24px;">
        <h3 style="color:#F1F5F9;font-size:16px;margin:0 0 16px;">Invite New Team Member</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Full Name</label>
            <input type="text" id="tm-name" class="amz-form-input" placeholder="John Doe">
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Email Address *</label>
            <input type="email" id="tm-email" class="amz-form-input" placeholder="john@company.com">
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Role</label>
            <select id="tm-role" class="amz-form-input">
              <option value="admin">Admin — Full access</option>
              <option value="sales">Sales — Products & orders</option>
              <option value="operations">Operations — Logistics & inventory</option>
              <option value="viewer" selected>Viewer — Read only</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="btn-send-invite" style="background:#3B82F6;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px;">Send Invitation</button>
          <button id="btn-cancel-invite" style="background:transparent;color:#94A3B8;border:1px solid rgba(148,163,184,0.2);padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;">Cancel</button>
        </div>
      </div>

      <!-- Team members table -->
      <div style="background:var(--sp-bg-raised,#111827);border:1px solid rgba(148,163,184,0.12);border-radius:12px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:rgba(148,163,184,0.06);">
              <th style="text-align:left;padding:14px 20px;font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">Name</th>
              <th style="text-align:left;padding:14px 16px;font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;">Email</th>
              <th style="text-align:left;padding:14px 16px;font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;">Role</th>
              <th style="text-align:left;padding:14px 16px;font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;">Status</th>
              <th style="text-align:center;padding:14px 16px;font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;">Actions</th>
            </tr>
          </thead>
          <tbody id="team-table-body">
            ${teamData.length === 0 ? `
              <tr><td colspan="5" style="text-align:center;padding:48px 20px;color:#64748B;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.5" style="margin-bottom:12px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <p style="font-size:14px;margin:0 0 4px;">No team members yet</p>
                <p style="font-size:12px;color:#475569;">Click "Invite Member" to add your first team member.</p>
              </td></tr>
            ` : teamData.map(m => `
              <tr style="border-top:1px solid rgba(148,163,184,0.08);">
                <td style="padding:14px 20px;color:#F1F5F9;font-weight:500;">${m.full_name || '—'}</td>
                <td style="padding:14px 16px;color:#CBD5E1;font-size:13px;">${m.email}</td>
                <td style="padding:14px 16px;"><span style="background:rgba(59,130,246,0.15);color:#60A5FA;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;">${roleLabels[m.role] || m.role}</span></td>
                <td style="padding:14px 16px;"><span style="color:${statusColors[m.status] || '#94A3B8'};font-size:12px;font-weight:600;text-transform:capitalize;">● ${m.status}</span></td>
                <td style="padding:14px 16px;text-align:center;">
                  <button class="btn-remove-member" data-id="${m.id}" style="background:transparent;border:1px solid rgba(239,68,68,0.3);color:#ef4444;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">Remove</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Owner info -->
      <div style="margin-top:20px;padding:16px 20px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:8px;display:flex;align-items:center;gap:10px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span style="color:#94A3B8;font-size:13px;">You are the <strong style="color:#60A5FA;">Owner</strong> of this account. Team members you invite will be linked to <strong style="color:#F1F5F9;">${factoryRecord.name}</strong>.</span>
      </div>
    </div>
  `;

  // Toggle add form
  document.getElementById('btn-add-member')?.addEventListener('click', () => {
    document.getElementById('team-add-form').style.display = 'block';
  });
  document.getElementById('btn-cancel-invite')?.addEventListener('click', () => {
    document.getElementById('team-add-form').style.display = 'none';
  });

  // Send invite
  document.getElementById('btn-send-invite')?.addEventListener('click', async () => {
    const email = document.getElementById('tm-email')?.value?.trim();
    const name = document.getElementById('tm-name')?.value?.trim();
    const role = document.getElementById('tm-role')?.value || 'viewer';

    if (!email) { alert('Please enter an email address.'); return; }

    const { error: insertErr } = await supabase.from('supplier_team_members').upsert({
      supplier_id: factoryRecord.id,
      email,
      full_name: name,
      role,
      invited_by: currentUser.id,
      status: 'pending'
    }, { onConflict: 'supplier_id,email' });

    if (insertErr) {
      alert('Failed to add team member: ' + insertErr.message);
      return;
    }

    // TODO: Send actual invite email via Resend/send-email function
    loadTeamTab(); // Refresh
  });

  // Remove handlers
  document.querySelectorAll('.btn-remove-member').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this team member?')) return;
      const id = btn.dataset.id;
      await supabase.from('supplier_team_members').delete().eq('id', id);
      loadTeamTab();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: DASHBOARD (KPI Overview + Notifications)
// ─────────────────────────────────────────────────────────────────────────────
async function loadDashboardTab() {
  const routing = document.getElementById('supplier-content-routing');

  // Load products + orders in parallel

  const [prodRes, orderRes] = await Promise.all([
    supabase.from('products').select('*').eq('supplier_id', factoryRecord.id),
    supabase.from('rfq_history').select('*').order('created_at', { ascending: false })
  ]);
  myProducts = prodRes.data || [];
  const allOrders = (orderRes.data || []).filter(r => r.rfq_data && String(r.rfq_data.supplier_id) === String(factoryRecord.id));

  const totalProducts = myProducts.length;
  const oosCount = myProducts.filter(p => !p.stock_quantity || p.stock_quantity === 0).length;
  const categories_set = new Set(myProducts.map(p => p.category_id).filter(Boolean));
  const pendingOrders = allOrders.filter(o => o.status === 'submitted').length;
  const totalRevenue = myProducts.reduce((s, p) => s + (Number(p.base_price || 0) * (p.stock_quantity || 0)), 0);

  routing.innerHTML = `
    <div class="sp-container">
      <h1 class="sp-page-title">Welcome back, ${factoryRecord.name}</h1>

      <!-- KPI Grid -->
      <div class="sp-kpi-grid">
        <div class="sp-kpi-card">
          <div class="sp-kpi-icon sp-kpi-icon--blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
          <div class="sp-kpi-label">Total Products</div>
          <div class="sp-kpi-value">${totalProducts}</div>
          <div class="sp-kpi-sub">${categories_set.size} categories</div>
        </div>
        <div class="sp-kpi-card">
          <div class="sp-kpi-icon sp-kpi-icon--green"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div class="sp-kpi-label">Inventory Value</div>
          <div class="sp-kpi-value">$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
          <div class="sp-kpi-sub">Across all listings</div>
        </div>
        <div class="sp-kpi-card ${pendingOrders > 0 ? 'sp-kpi-card--warning' : ''}">
          <div class="sp-kpi-icon sp-kpi-icon--amber"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <div class="sp-kpi-label">Orders to Fulfill</div>
          <div class="sp-kpi-value">${pendingOrders}</div>
          <div class="sp-kpi-sub">${allOrders.length} total orders</div>
        </div>
        <div class="sp-kpi-card ${oosCount > 0 ? 'sp-kpi-card--danger' : ''}">
          <div class="sp-kpi-icon sp-kpi-icon--red"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div class="sp-kpi-label">Stock Warnings</div>
          <div class="sp-kpi-value">${oosCount}</div>
          <div class="sp-kpi-sub">${oosCount > 0 ? 'Items out of stock' : 'All stocked'}</div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="sp-notifications">
        <div class="sp-notifications-header">
          <span class="sp-notifications-title">Recent Activity</span>
        </div>
        ${pendingOrders > 0 ? `<div class="sp-notification-item"><span class="sp-notification-dot sp-notification-dot--amber"></span><span class="sp-notification-text"><strong>${pendingOrders} pending RFQ request${pendingOrders > 1 ? 's' : ''}</strong> awaiting your response</span><span class="sp-notification-time">Action needed</span></div>` : ''}
        ${oosCount > 0 ? `<div class="sp-notification-item"><span class="sp-notification-dot sp-notification-dot--red"></span><span class="sp-notification-text"><strong>${oosCount} product${oosCount > 1 ? 's' : ''}</strong> out of stock — update inventory to avoid missed opportunities</span><span class="sp-notification-time">Warning</span></div>` : ''}
        ${totalProducts === 0 ? `<div class="sp-notification-item"><span class="sp-notification-dot sp-notification-dot--blue"></span><span class="sp-notification-text">Get started by adding your first product listing</span><span class="sp-notification-time">Tip</span></div>` : ''}
        ${pendingOrders === 0 && oosCount === 0 && totalProducts > 0 ? `<div class="sp-notification-item"><span class="sp-notification-dot sp-notification-dot--blue"></span><span class="sp-notification-text">All clear — no urgent actions required</span><span class="sp-notification-time">Now</span></div>` : ''}
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CATALOG (Product Listings — Redesigned)
// ─────────────────────────────────────────────────────────────────────────────
async function loadCatalogTab() {
  const routing = document.getElementById('supplier-content-routing');
  
  routing.innerHTML = `
    <div class="sp-container">
      <h1 class="sp-page-title">Products</h1>
      <div class="sp-table-toolbar">
        <div class="sp-search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" id="sp-product-search" placeholder="Search by name, SKU, or category...">
        </div>
        <button class="sp-btn sp-btn--primary" id="btn-create-product">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>
      <div id="catalog-grid"></div>
    </div>
  `;

  document.getElementById('btn-create-product').addEventListener('click', () => renderCreateProductForm());


  const { data } = await supabase.from('products').select('*').eq('supplier_id', factoryRecord.id);
  myProducts = data || [];

  const grid = document.getElementById('catalog-grid');

  // Search filter
  document.getElementById('sp-product-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const rows = grid.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  });

  if (myProducts.length === 0) {
    grid.innerHTML = `<div class="sp-table-wrapper"><div class="sp-empty-state"><div class="sp-empty-title">No products yet</div><div class="sp-empty-sub">Create your first listing to start receiving orders.</div></div></div>`;
    return;
  }

  // ── Build category tree ──
  // Group products by category. Build parent→sub hierarchy.
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });
  const productsByCat = {};
  myProducts.forEach(p => {
    const cid = p.category_id || '__uncategorized__';
    if (!productsByCat[cid]) productsByCat[cid] = [];
    productsByCat[cid].push(p);
  });

  // Build ordered list: parent categories (with their subs) then uncategorized
  const rootCats = categories.filter(c => !c.parent_id);
  const orderedGroups = []; // { cat, subGroups: [{ cat, products }], products (direct) }
  const usedCatIds = new Set();

  rootCats.forEach(root => {
    const subs = categories.filter(c => c.parent_id === root.id);
    const subGroups = subs.map(sub => {
      usedCatIds.add(sub.id);
      return { cat: sub, products: productsByCat[sub.id] || [] };
    }).filter(sg => sg.products.length > 0);
    const directProducts = productsByCat[root.id] || [];
    usedCatIds.add(root.id);
    if (directProducts.length > 0 || subGroups.length > 0) {
      orderedGroups.push({ cat: root, subGroups, products: directProducts });
    }
  });

  // Categories that are children but whose parent isn't a root (orphaned)
  Object.keys(productsByCat).forEach(cid => {
    if (cid === '__uncategorized__' || usedCatIds.has(cid)) return;
    const cat = catMap[cid];
    if (cat) {
      orderedGroups.push({ cat, subGroups: [], products: productsByCat[cid] });
      usedCatIds.add(cid);
    }
  });

  // Uncategorized last
  if (productsByCat['__uncategorized__']?.length) {
    orderedGroups.push({ cat: { id: '__uncategorized__', name: 'Uncategorized' }, subGroups: [], products: productsByCat['__uncategorized__'] });
  }

  // ── Render product row HTML (reusable) ──
  function renderProductRow(p) {
    const stock = p.stock_quantity || 0;
    const isOOS = stock === 0;
    const tiers = (p.pricing_tiers && p.pricing_tiers.length > 0)
      ? p.pricing_tiers.slice(0, 3)
      : [{ min_quantity: 1, unit_price: Number(p.base_price || 0), lead_time_days: '' }];
    while (tiers.length < 3) tiers.push({ min_quantity: '', unit_price: '', lead_time_days: '' });
    const tiersHtml = tiers.map((t, i) => `
      <div class="sp-tier-row">
        <span class="sp-tier-moq">MOQ</span>
        <input type="number" min="0" value="${t.min_quantity || ''}" placeholder="—" data-pid="${p.id}" data-tier="${i}" data-tf="qty">
        <span class="sp-tier-label">→ $</span>
        <input type="number" step="0.01" min="0" value="${t.unit_price || ''}" placeholder="—" data-pid="${p.id}" data-tier="${i}" data-tf="price">
        <span class="sp-tier-label">/</span>
        <input type="number" min="0" value="${t.lead_time_days || ''}" placeholder="—" data-pid="${p.id}" data-tier="${i}" data-tf="lead">
        <span class="sp-tier-label">days</span>
      </div>
    `).join('');
    return `
      <tr data-row-id="${p.id}" class="sp-drag-row" draggable="true">
        <td style="width:4%"><span class="sp-drag-grip" title="Drag to move">⠿</span></td>
        <td style="width:26%">
          <div class="sp-product-cell">
            <img src="${p.image_url || p.specs?.images?.[0] || '/placeholder.png'}" class="sp-product-thumb" alt="">
            <div class="sp-product-info">
              <span class="sp-product-name" data-product-id="${p.id}">${p.description || p.mpn}</span>
              <span class="sp-product-mpn">${p.mpn}</span>
            </div>
          </div>
        </td>
        <td><span class="sp-status ${isOOS ? 'sp-status--oos' : 'sp-status--active'}">${isOOS ? 'Out of stock' : 'Active'}</span></td>
        <td><input type="number" class="sp-inline-input sp-inline-input--wide" value="${stock}" min="0" data-field="stock" data-id="${p.id}"></td>
        <td style="width:34%"><div class="sp-tiers-mini">${tiersHtml}</div></td>
        <td style="width:90px">
          <div class="sp-row-actions">
            <button class="sp-row-save" data-save-id="${p.id}" disabled>Save</button>
            <button class="sp-row-btn btn-edit-prod" data-id="${p.id}">Edit</button>
          </div>
        </td>
      </tr>`;
  }

  // ── Render category group HTML ──
  function renderCatGroup(group, isSub = false) {
    const prods = group.products || [];
    const subHtml = (group.subGroups || []).map(sg => renderCatGroup(sg, true)).join('');
    const tableRows = prods.map(p => renderProductRow(p)).join('');
    const isUncat = group.cat.id === '__uncategorized__';
    const nameClass = isUncat ? 'sp-cat-name sp-uncat-label' : 'sp-cat-name';
    const totalCount = prods.length + (group.subGroups || []).reduce((s, sg) => s + (sg.products?.length || 0), 0);
    return `
      <div class="sp-cat-group ${isSub ? 'sp-cat-sub' : ''}" data-cat-id="${group.cat.id}" draggable="${!isSub}" >
        <div class="sp-cat-header" data-cat-toggle="${group.cat.id}">
          ${!isSub ? '<span class="sp-cat-drag-handle" title="Drag to reorder">⠿</span>' : ''}
          <span class="sp-cat-chevron">▼</span>
          <span class="${nameClass}">${group.cat.name}</span>
          <span class="sp-cat-count">${totalCount}</span>
        </div>
        <div class="sp-cat-body" data-cat-body="${group.cat.id}">
          ${subHtml}
          ${tableRows ? `
            <div class="sp-table-wrapper" style="border-radius:0; border-top:none;">
              <table class="sp-table">
                <thead><tr>
                  <th style="width:4%"></th>
                  <th style="width:26%">Product</th><th>Status</th><th>Stock</th>
                  <th style="width:34%">Pricing Tiers <span style="font-weight:400;text-transform:none;letter-spacing:0;opacity:0.6;">(MOQ → Price / Lead)</span></th>
                  <th style="width:90px"></th>
                </tr></thead>
                <tbody>${tableRows}</tbody>
              </table>
            </div>` : ''}
        </div>
      </div>`;
  }

  // ── Master table header ──
  grid.innerHTML = `
    <div class="sp-table-wrapper" style="margin-bottom:8px;">
      <table class="sp-table">
        <thead><tr>
          <th style="width:4%"></th>
          <th style="width:26%">Product</th>
          <th>Status</th>
          <th>Stock</th>
          <th style="width:34%">Pricing Tiers  <span style="font-weight:400;text-transform:none;letter-spacing:0;opacity:0.6;">(MOQ → Price / Lead)</span></th>
          <th style="width:90px"></th>
        </tr></thead>
      </table>
    </div>
    ${orderedGroups.map(g => renderCatGroup(g)).join('')}
  `;

  // ── Collapse / expand category headers ──
  grid.querySelectorAll('.sp-cat-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Ignore if clicking drag handle
      if (e.target.closest('.sp-cat-drag-handle')) return;
      const catId = header.dataset.catToggle;
      const body = grid.querySelector(`[data-cat-body="${catId}"]`);
      if (!body) return;
      const isCollapsed = body.classList.contains('collapsed');
      if (isCollapsed) {
        body.style.maxHeight = body.scrollHeight + 'px';
        body.classList.remove('collapsed');
        header.classList.remove('collapsed');
        setTimeout(() => { body.style.maxHeight = 'none'; }, 260);
      } else {
        body.style.maxHeight = body.scrollHeight + 'px';
        requestAnimationFrame(() => {
          body.style.maxHeight = '0px';
          body.classList.add('collapsed');
          header.classList.add('collapsed');
        });
      }
    });
  });

  // ── Edit & detail click handlers ──
  grid.querySelectorAll('.btn-edit-prod, .sp-product-name').forEach(el => {
    el.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id || e.currentTarget.dataset.productId;
      renderCreateProductForm(id);
    });
  });

  // ── Dirty tracking & Save ──
  function markRowDirty(productId) {
    const saveBtn = grid.querySelector(`.sp-row-save[data-save-id="${productId}"]`);
    if (saveBtn) saveBtn.disabled = false;
  }
  grid.querySelectorAll('.sp-inline-input[data-field="stock"]').forEach(el => {
    el.addEventListener('input', () => markRowDirty(el.dataset.id));
  });
  grid.querySelectorAll('.sp-tier-row input').forEach(el => {
    el.addEventListener('input', () => markRowDirty(el.dataset.pid));
  });

  grid.querySelectorAll('.sp-row-save').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pid = btn.dataset.saveId;
      const prod = myProducts.find(p => p.id === pid);
      if (!prod) return;
      btn.textContent = 'Saving…';
      btn.classList.add('sp-saving');
      const stockInput = grid.querySelector(`.sp-inline-input[data-id="${pid}"]`);
      const stockVal = stockInput ? Number(stockInput.value) || 0 : (prod.stock_quantity || 0);
      const tierInputs = grid.querySelectorAll(`.sp-tier-row input[data-pid="${pid}"]`);
      const tiersMap = {};
      tierInputs.forEach(inp => {
        const idx = Number(inp.dataset.tier);
        if (!tiersMap[idx]) tiersMap[idx] = { min_quantity: 0, unit_price: 0, lead_time_days: 0 };
        const val = Number(inp.value) || 0;
        if (inp.dataset.tf === 'qty') tiersMap[idx].min_quantity = val;
        else if (inp.dataset.tf === 'price') tiersMap[idx].unit_price = val;
        else if (inp.dataset.tf === 'lead') tiersMap[idx].lead_time_days = val;
      });
      const cleanTiers = Object.values(tiersMap).filter(t => t.min_quantity || t.unit_price);
      const base_price = cleanTiers[0]?.unit_price || 0;
      const { error } = await supabase.from('products').update({
        stock_quantity: stockVal, pricing_tiers: cleanTiers, base_price
      }).eq('id', pid);
      if (!error) {
        prod.stock_quantity = stockVal; prod.pricing_tiers = cleanTiers; prod.base_price = base_price;
        btn.textContent = '✓ Saved'; btn.disabled = true;
        setTimeout(() => { btn.textContent = 'Save'; btn.classList.remove('sp-saving'); }, 1500);
      } else {
        btn.textContent = 'Error'; btn.classList.remove('sp-saving');
        setTimeout(() => { btn.textContent = 'Save'; btn.disabled = false; }, 2000);
      }
    });
  });

  // ── Drag & Drop: products between categories ──
  let draggedRow = null;
  grid.querySelectorAll('tr.sp-drag-row').forEach(row => {
    row.addEventListener('dragstart', (e) => {
      draggedRow = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', row.dataset.rowId);
    });
    row.addEventListener('dragend', () => {
      draggedRow = null;
      row.classList.remove('dragging');
      grid.querySelectorAll('.drag-over, .drag-over-row').forEach(el => el.classList.remove('drag-over', 'drag-over-row'));
    });
  });

  // Drop targets: category groups
  grid.querySelectorAll('.sp-cat-group').forEach(group => {
    group.addEventListener('dragover', (e) => {
      if (!draggedRow) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      group.classList.add('drag-over');
    });
    group.addEventListener('dragleave', (e) => {
      if (!group.contains(e.relatedTarget)) group.classList.remove('drag-over');
    });
    group.addEventListener('drop', async (e) => {
      e.preventDefault();
      group.classList.remove('drag-over');
      if (!draggedRow) return;
      const productId = draggedRow.dataset.rowId;
      const targetCatId = group.dataset.catId;
      if (targetCatId === '__uncategorized__') return;

      // Move the row DOM into this group's tbody
      const tbody = group.querySelector('tbody');
      if (tbody && draggedRow.parentElement !== tbody) {
        tbody.appendChild(draggedRow);
        // Update count badges
        grid.querySelectorAll('.sp-cat-group').forEach(g => {
          const cnt = g.querySelectorAll('tr.sp-drag-row').length;
          const badge = g.querySelector('.sp-cat-count');
          if (badge) badge.textContent = cnt;
        });
      }

      // Persist to DB
      const prod = myProducts.find(p => p.id === productId);
      if (prod) {
        prod.category_id = targetCatId;
        await supabase.from('products').update({ category_id: targetCatId }).eq('id', productId);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD PRODUCT VIEW (Amazon Style)
// ─────────────────────────────────────────────────────────────────────────────
function renderCreateProductForm(editProdId = null) {
  const routing = document.getElementById('supplier-content-routing');
  const prod = editProdId ? myProducts.find(p => p.id === editProdId) : null;
  const specs = prod?.specs || {};
  
  const rootCats = categories.filter(c => !c.parent_id);
  const options = [];
  rootCats.forEach(r => {
    const subs = categories.filter(c => c.parent_id === r.id);
    if(subs.length === 0) {
      options.push(`<option data-id="${r.id}" value="${r.name}"></option>`);
    } else {
      subs.forEach(s => options.push(`<option data-id="${s.id}" value="${r.name} > ${s.name}"></option>`));
    }
  });

  const getCatName = (id) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return '';
    if (cat.parent_id) {
       const p = categories.find(p => p.id === cat.parent_id);
       return p ? p.name + ' > ' + cat.name : cat.name;
    }
    return cat.name;
  };

  const asinMock = prod ? prod.id.substring(0,8).toUpperCase() : 'NEW_ASIN';

  // Pre-escape HTML for source textarea (avoids regex in template literal)
  const rawHtml = prod?.rich_description || '';
  const escHtml = rawHtml.split('<').join('&lt;').split('>').join('&gt;');

  routing.innerHTML = `
<div class="amz-container">
    <!-- Top Header -->
    <div style="margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid var(--amz-border);">
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
         <div style="flex:1;">
            <label style="font-size:12px; font-weight:700; color:#565959; margin-bottom:4px; display:block; text-transform:uppercase; letter-spacing:0.5px;">Product Name / Title</label>
            <input type="text" id="p-desc" required class="amz-form-input" style="font-size:20px; font-weight:700; padding:10px 14px; border:1px solid #ccc; width:100%; border-radius:4px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);" value="${prod?.description || ''}">
         </div>
      </div>
    </div>

    <form id="new-product-form">
      <!-- Top Grid 3-Columns -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:32px; margin-bottom:48px;">
        
        <!-- Left: Image & Media Management -->
        <div>
          <label style="font-size:12px; font-weight:700; color:#111; margin-bottom:10px; display:block; text-transform:uppercase; border-bottom:2px solid #e0e0e0; padding-bottom:6px;">Media & Documents</label>
          
          <div style="text-align:center; padding:24px; border:1px solid #ccc; background:#fff; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:16px; position:relative;">
             <img id="prod-main-img-preview" src="${prod?.image_url || prod?.specs?.images?.[0] || prod?.specs?.image_url || '/placeholder.png'}" style="max-width:100%; max-height:200px; height:auto; margin-bottom:16px; object-fit:contain;">
             <br>
             <button type="button" onclick="document.getElementById('p-img-file').click()" style="background:#fff; border:1px solid #007185; color:#007185; padding:8px 16px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:700; transition:background 0.2s; width:100%;">
                <svg style="vertical-align:middle; margin-right:4px; margin-top:-2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Upload Main Image
             </button>
             <input type="file" accept="image/*" id="p-img-file" style="display:none;">
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
             <!-- Extra Images -->
             <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #e0e0e0; padding:8px 12px; border-radius:4px; background:#fafafa;">
                <div style="font-size:12px; color:#333; font-weight:600;"><svg style="vertical-align:middle; margin-right:6px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Extra Gallery Images</div>
                <button type="button" onclick="document.getElementById('p-extra-imgs').click()" style="background:none; border:none; color:#007185; font-size:12px; font-weight:700; cursor:pointer;">Add</button>
                <input type="file" accept="image/*" multiple id="p-extra-imgs" style="display:none;">
             </div>
             <!-- 3D Model -->
             <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #e0e0e0; padding:8px 12px; border-radius:4px; background:#fafafa;">
                <div style="font-size:12px; color:#333; font-weight:600;"><svg style="vertical-align:middle; margin-right:6px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> 3D Model (STEP/STL)</div>
                <button type="button" onclick="document.getElementById('p-3d-model').click()" style="background:none; border:none; color:#007185; font-size:12px; font-weight:700; cursor:pointer;">Add</button>
                <input type="file" accept=".stp,.step,.stl,.igs,.iges" id="p-3d-model" style="display:none;">
             </div>
             <!-- 2D Drawing -->
             <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #e0e0e0; padding:8px 12px; border-radius:4px; background:#fafafa;">
                <div style="font-size:12px; color:#333; font-weight:600;"><svg style="vertical-align:middle; margin-right:6px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> 2D Drawing (PDF/DXF)</div>
                <button type="button" onclick="document.getElementById('p-2d-drawing').click()" style="background:none; border:none; color:#007185; font-size:12px; font-weight:700; cursor:pointer;">Add</button>
                <input type="file" accept=".pdf,.dxf,.dwg" id="p-2d-drawing" style="display:none;">
             </div>
             <!-- Product Video -->
             <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #e0e0e0; padding:8px 12px; border-radius:4px; background:#fafafa;">
                <div style="font-size:12px; color:#333; font-weight:600;"><svg style="vertical-align:middle; margin-right:6px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> Video (.MP4)</div>
                <button type="button" onclick="document.getElementById('p-video').click()" style="background:none; border:none; color:#007185; font-size:12px; font-weight:700; cursor:pointer;">Add</button>
                <input type="file" accept="video/mp4" id="p-video" style="display:none;">
             </div>
          </div>
        </div>

        <!-- Middle: Properties -->
        <div>
          <label style="font-size:12px; font-weight:700; color:#111; margin-bottom:10px; display:block; text-transform:uppercase; border-bottom:2px solid #e0e0e0; padding-bottom:6px;">Basic Identities</label>
          <table style="width:100%; border-collapse:collapse; font-size:13px; line-height:1.6;" class="e14-prop-table">
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px 0; color:#666; width:35%;">Category</td>
              <td style="padding:10px 0;">
                 <input list="category-datalist" id="p-category" required class="amz-form-input" placeholder="Search categories..." value="${getCatName(prod?.category_id)}" style="width:100%; padding:6px 10px; border:1px solid #ccc; border-radius:3px;">
                 <datalist id="category-datalist">${options.join('')}</datalist>
              </td>
            </tr>
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px 0; color:#666;">Manufacturer Part No</td>
              <td style="padding:10px 0;">
                <input type="text" id="p-mpn" required class="amz-form-input" style="width:100%; padding:6px 10px; border:1px solid #ccc; border-radius:3px; font-weight:700; font-size:14px; color:#111;" value="${prod?.mpn || ''}">
              </td>
            </tr>
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px 0; color:#666;">Internal SKU</td>
              <td style="padding:10px 0;">
                <input type="text" id="internal-sku" class="amz-form-input" style="width:100%; padding:6px 10px; border:1px solid #ccc; border-radius:3px; color:#333;" value="${prod?.mpn || ''}" placeholder="Optional">
              </td>
            </tr>
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px 0; color:#666;">Product Type</td>
              <td style="padding:10px 0;">
                <input type="text" id="product-type" class="amz-form-input" style="width:100%; padding:6px 10px; border:1px solid #ccc; border-radius:3px; color:#333;" value="INDUSTRIAL_COMPONENT">
              </td>
            </tr>
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px 0; color:#666;">Technical Datasheet</td>
              <td style="padding:10px 0;">
                 <div style="display:flex; align-items:center; gap:8px;">
                     <input type="file" accept="application/pdf" id="p-pdf-file" style="font-size:11px; width:100%; padding:4px;">
                 </div>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0; color:#666; font-weight:600;">
                Inventory on Hand
                <div style="font-size:11px; color:#999; font-weight:400;">Units available to ship</div>
              </td>
              <td style="padding:10px 0;">
                <input type="number" id="p-stock-qty" min="0" step="1"
                  class="amz-form-input"
                  style="width:120px; padding:6px 10px; border:1px solid #ccc; border-radius:3px; color:#111; font-size:14px; font-weight:700;"
                  value="${prod?.stock_quantity ?? 0}" placeholder="0">
                <span style="font-size:12px; color:#666; margin-left:8px;">units</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Right: Commerce / Pricing -->
        <div style="border-left:1px solid #eee; padding-left:32px;">
          <div style="color:#007185; font-size:15px; font-weight:700; margin-bottom:12px; border-bottom:2px solid #007185; padding-bottom:6px; display:inline-block;">
            <svg style="vertical-align:middle; margin-right:4px;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/></svg> Pricing & Logistics
          </div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;" id="pricing-tiers-table">
            <thead>
              <tr style="background: #F0F2F2; border-top: 1px solid #ccc; border-bottom: 2px solid #ccc;">
                <th style="padding: 8px 6px; text-align: left; color:#555; text-transform:uppercase;">MoQ</th>
                <th style="padding: 8px 6px; text-align: left; color:#555; text-transform:uppercase;">Lead (Days)</th>
                <th style="padding: 8px 6px; text-align: left; color:#555; text-transform:uppercase;">Unit Price</th>
                <th style="padding: 8px 6px; text-align: center; color:#555;">CTRL</th>
              </tr>
            </thead>
            <tbody id="pricing-tiers-body">
            </tbody>
          </table>
          <button type="button" id="btn-add-tier" style="margin-top:8px; background:#fff; border:1px solid #007185; color:#007185; padding:6px 12px; border-radius:3px; font-size:11px; font-weight:700; cursor:pointer; width:100%; transition:background 0.2s;">+ Add Volume Tier</button>

          <div style="margin-top:32px;">
            <div style="font-weight:700; font-size:12px; color:#111; margin-bottom:12px; text-transform:uppercase; border-bottom:2px solid #e0e0e0; padding-bottom:4px;">Packaging Dimensions</div>
            <div id="packaging-layers-container"></div>
            <button type="button" id="btn-add-packaging-layer" style="margin-top:8px; background:#FAFAFA; border:1px dashed #aaa; color:#333; padding:8px 12px; border-radius:3px; font-size:11px; font-weight:700; cursor:pointer; width:100%; transition:all 0.2s;">+ Add Packaging Layer</button>
          </div>
        </div>
      </div>

      <!-- Bottom Structured Data -->
      <div style="max-width: 1000px;">
        
        <!-- Product Overview (Rich Text) -->
        <h2 style="font-size:16px; font-weight:700; border-bottom:2px solid #007185; padding-bottom:6px; margin-bottom:16px; color:#111; display:inline-block;">Product Overview</h2>
        
        <div style="border: 1px solid #ccc; border-radius: 4px; background: #fff; margin-bottom:32px; box-shadow:0 1px 4px rgba(0,0,0,0.03);" id="rich-editor-wrapper">
          <div style="background: #f9f9f9; padding: 8px 12px; border-bottom: 1px solid #ccc; display:flex; gap: 8px; flex-wrap:wrap; align-items:center;" id="editor-toolbar">
            <button type="button" onclick="document.execCommand('formatBlock',false,'H1')" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; font-weight:700; padding:4px 10px; font-size:12px; color:#333;">H1</button>
            <button type="button" onclick="document.execCommand('formatBlock',false,'H2')" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; font-weight:700; padding:4px 10px; font-size:12px; color:#333;">H2</button>
            <hr style="width:1px; height:20px; background:#ccc; border:none; margin:0 4px;">
            <button type="button" onclick="document.execCommand('bold',false,null)" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; font-weight:700; padding:4px 10px; color:#333;">B</button>
            <button type="button" onclick="document.execCommand('italic',false,null)" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; font-style:italic; padding:4px 10px; color:#333;">I</button>
            <button type="button" onclick="document.execCommand('underline',false,null)" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; text-decoration:underline; padding:4px 10px; color:#333;">U</button>
            <hr style="width:1px; height:20px; background:#ccc; border:none; margin:0 4px;">
            <button type="button" onclick="document.execCommand('insertUnorderedList',false,null)" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; padding:4px 10px; color:#333;">• List</button>
            <button type="button" onclick="document.getElementById('rich-desc-img-upload').click()" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; padding:4px 10px; display:flex; align-items:center; gap:4px; color:#333;">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Image
            </button>
            <input type="file" accept="image/*" id="rich-desc-img-upload" style="display:none;">
            <div class="sp-editor-mode-toggle">
              <button type="button" id="btn-mode-visual" class="active">Visual</button>
              <button type="button" id="btn-mode-html">HTML</button>
            </div>
          </div>
          <div id="rich-description" contenteditable="true" style="min-height: 220px; padding: 20px; outline: none; font-size:14px; line-height:1.7; color:#222; overflow:hidden;">${prod?.rich_description || ''}</div>
          <textarea id="html-source-editor" style="display:none;">${escHtml}</textarea>
        </div>

        <!-- Applications -->
        <h2 style="font-size:16px; font-weight:700; border-bottom:2px solid #007185; padding-bottom:6px; margin-bottom:16px; color:#111; display:inline-block;">Applications</h2>
        <input type="text" id="p-applications" class="amz-form-input" style="width:100%; padding:10px 14px; border:1px solid #ccc; border-radius:4px; font-size:14px; margin-bottom:48px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.03);" placeholder="e.g. Industrial Control, Telecommunications, Automotive..." value="${prod?.applications || 'Industrial, Manufacturing'}">

        <!-- Technical Specifications -->
        <h2 style="font-size:16px; font-weight:700; border-bottom:2px solid #007185; padding-bottom:6px; margin-bottom:24px; color:#111; display:inline-block;">Technical Specifications</h2>
        <div style="background:#fafafa; border:1px solid #e0e0e0; border-radius:4px; padding:24px; margin-bottom:64px;">
           <div id="dynamic-params-container" style="display:grid; grid-template-columns: 1fr 1fr; gap:x-large; align-items:start; row-gap:16px; column-gap:48px;">
              <div style="grid-column: span 2; text-align:center; padding:32px; color:#565959; font-size:13px;">Select a category to load specifications...</div>
           </div>
        </div>
        
        <div style="height: 140px;"></div>

      </div>
</div>

      <!-- Action Footer -->
      <div style="position:fixed; bottom:0; left:0; right:0; border-top:1px solid #ccc; padding:16px 32px; text-align:right; z-index:999; background: #fff; box-shadow:0 -2px 10px rgba(0,0,0,0.05);">
         <button type="button" class="amz-btn" id="btn-cancel-product" style="margin-right:16px; background:#fff; border:1px solid #ccc; padding:10px 24px; color:#333; font-weight:600; border-radius:4px; cursor:pointer;">Cancel</button>
         <button type="button" id="btn-save-product" class="amz-btn" style="background:#007185; border:1px solid #007185; color:#fff; padding:10px 32px; font-weight:700; border-radius:4px; cursor:pointer; font-size:14px; box-shadow:0 2px 4px rgba(13, 130, 70, 0.2);">Save and Finish</button>
      </div>

    </form>
  `;

  document.getElementById('btn-cancel-product').addEventListener('click', loadCatalogTab);
  // ── Live file-input feedback ─────────────────────────────────────────────
  // Main image: show thumbnail preview immediately on file select
  document.getElementById('p-img-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = document.getElementById('prod-main-img-preview');
      if (preview) preview.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Extra images: show count badge
  document.getElementById('p-extra-imgs')?.addEventListener('change', (e) => {
    const n = e.target.files.length;
    const row = e.target.closest('div[style]');
    if (!row) return;
    let badge = row.querySelector('.file-badge');
    if (!badge) { badge = document.createElement('span'); badge.className='file-badge'; badge.style.cssText='font-size:11px;color:#10b981;font-weight:700;margin-left:6px;'; row.querySelector('div').appendChild(badge); }
    badge.textContent = n + ' file' + (n > 1 ? 's' : '') + ' selected';
  });

  // Generic filename feedback for 3D model, 2D drawing, video, PDF
  ['p-3d-model', 'p-2d-drawing', 'p-video', 'p-pdf-file'].forEach(inputId => {
    document.getElementById(inputId)?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const row = e.target.closest('div[style]') || e.target.closest('td');
      if (!row) return;
      let badge = row.querySelector('.file-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'file-badge';
        badge.style.cssText = 'font-size:11px;color:#10b981;font-weight:700;margin-top:4px;word-break:break-all;';
        e.target.insertAdjacentElement('afterend', badge);
      }
      badge.textContent = '✓ ' + file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB)';
    });
  });


  // Dynamic Parameter Injection
  const catSelect = document.getElementById('p-category');
  const dpc = document.getElementById('dynamic-params-container');

  function renderDynamicParams(catId) {
    if(!catId) {
       dpc.innerHTML = `<div style="grid-column: span 2; text-align:center; padding:32px; color:#565959; font-size:13px;">Attributes will populate based on category selection.</div>`;
       return;
    }

    // ── Collect params from THIS category AND its parent (common_parameters) ──
    const selectedCat = categories.find(c => c.id === catId);
    const parentId = selectedCat?.parent_id;
    const relevantCatIds = [catId];
    if (parentId) relevantCatIds.push(parentId);

    const paramsForCat = categoryParameters.filter(p => relevantCatIds.includes(p.category_id));
    const seenNames = new Set();
    const deduped = [];
    // Prefer child params over parent for same name
    const childParams = paramsForCat.filter(p => p.category_id === catId);
    const parentParams = paramsForCat.filter(p => p.category_id !== catId);
    [...childParams, ...parentParams].forEach(p => {
      if (!seenNames.has(p.parameter_name)) {
        seenNames.add(p.parameter_name);
        deduped.push(p);
      }
    });

    if(deduped.length === 0) {
      dpc.innerHTML = `
        <div style="grid-column: span 2; text-align:center; padding:32px; color:#565959; font-size:13px;">
          No specific attributes defined for this category yet.
        </div>
        <div style="grid-column: span 2; text-align:center; padding:8px 0 16px;">
          <button type="button" id="btn-add-custom-param" style="background:#007185; border:none; color:#fff; padding:8px 18px; border-radius:4px; font-size:12px; font-weight:700; cursor:pointer;">+ Add Custom Parameter</button>
        </div>`;
      document.getElementById('btn-add-custom-param')?.addEventListener('click', () => showAddCustomParamModal(catId));
      return;
    }

    const priorityOrder = { required: 0, recommended: 1, optional: 2 };
    const sorted = [...deduped].sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));

    const reqCount = sorted.filter(p => (p.priority || 'optional') === 'required').length;
    let html = '';

    // ── Prompt banner for required fields ──
    if (reqCount > 0) {
      html += `
        <div style="grid-column: span 2; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:10px 16px; margin-bottom:12px; display:flex; align-items:center; gap:10px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style="font-size:12px; color:#92400e; font-weight:600;">${reqCount} required specification${reqCount > 1 ? 's' : ''} must be completed before saving. Fields marked with <span style="color:#e00;">*</span> are mandatory.</span>
        </div>`;
    }

    // ── Group by source: Category-specific first, then inherited ──
    const catSpecific = sorted.filter(p => p.category_id === catId);
    const inherited = sorted.filter(p => p.category_id !== catId);

    function renderParamRow(p) {
      const prio = p.priority || 'optional';
      const isRequired = prio === 'required';
      const prioTag = isRequired
        ? '<span style="display:inline-block; font-size:9px; background:#fef2f2; color:#dc2626; padding:1px 6px; border-radius:3px; font-weight:700; margin-left:6px; text-transform:uppercase;">Required</span>'
        : (prio === 'recommended'
          ? '<span style="display:inline-block; font-size:9px; background:#eff6ff; color:#2563eb; padding:1px 6px; border-radius:3px; font-weight:700; margin-left:6px; text-transform:uppercase;">Recommended</span>'
          : '');
      let inputHtml = '';
      if(p.data_type === 'boolean') {
        inputHtml = `<select ${isRequired ? 'required' : ''} id="spec-${p.id}" style="width:100%; border:1px solid #ccc; padding:6px 10px; border-radius:3px; background:#fff;"><option value="">— Select —</option><option value="true">Yes</option><option value="false">No</option></select>`;
      } else if (p.data_type === 'number') {
        inputHtml = `<input ${isRequired ? 'required' : ''} type="number" step="any" id="spec-${p.id}" placeholder="${p.unit ? 'e.g. value in ' + p.unit : ''}" style="width:100%; border:1px solid ${isRequired ? '#fca5a5' : '#ccc'}; padding:6px 10px; border-radius:3px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.03);">`;
      } else {
        inputHtml = `<input ${isRequired ? 'required' : ''} type="text" id="spec-${p.id}" placeholder="${p.unit ? 'e.g. value in ' + p.unit : ''}" style="width:100%; border:1px solid ${isRequired ? '#fca5a5' : '#ccc'}; padding:6px 10px; border-radius:3px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.03);">`;
      }
      return `
        <div class="amz-dynamic-param" style="display:flex; border-bottom:1px solid #f0f0f0; padding-bottom:8px; align-items:center;">
          <div style="width:40%; font-size:13px; color:#666;">${isRequired ? '<span style="color:#e00;">*</span> ' : ''}${p.parameter_name} ${p.unit ? `[${p.unit}]` : ''}${prioTag}</div>
          <div style="width:60%;">
            ${inputHtml}
          </div>
        </div>`;
    }

    if (catSpecific.length > 0) {
      html += `<div style="grid-column: span 2; font-size:11px; font-weight:700; color:#007185; text-transform:uppercase; letter-spacing:0.5px; padding:8px 0 4px; border-bottom:1px solid #e0e0e0; margin-bottom:8px;">${selectedCat?.name || 'Category'} Parameters</div>`;
      catSpecific.forEach(p => { html += renderParamRow(p); });
    }

    if (inherited.length > 0) {
      const parentCat = categories.find(c => c.id === parentId);
      html += `<div style="grid-column: span 2; font-size:11px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.5px; padding:12px 0 4px; border-bottom:1px solid #e0e0e0; margin-bottom:8px;">Common Parameters (${parentCat?.name || 'Parent Category'})</div>`;
      inherited.forEach(p => { html += renderParamRow(p); });
    }

    // ── Add Custom Parameter button ──
    html += `
      <div style="grid-column: span 2; text-align:center; padding:16px 0 8px; border-top:1px dashed #e0e0e0; margin-top:12px;">
        <button type="button" id="btn-add-custom-param" style="background:#fff; border:1px solid #007185; color:#007185; padding:8px 18px; border-radius:4px; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.2s;">+ Add Custom Parameter</button>
      </div>`;

    dpc.innerHTML = html;

    // Wire custom param button
    document.getElementById('btn-add-custom-param')?.addEventListener('click', () => showAddCustomParamModal(catId));
  }

  // ── Add Custom Parameter Modal ──────────────────────────────────────────
  async function showAddCustomParamModal(catId) {
    // Remove existing modal if any
    document.getElementById('custom-param-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-param-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:inherit;';
    modal.innerHTML = `
      <div style="background:#fff; border-radius:12px; padding:32px; width:460px; max-width:90vw; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <h3 style="margin:0 0 4px 0; font-size:18px; color:#111; font-weight:700;">Add Custom Parameter</h3>
        <p style="margin:0 0 20px 0; font-size:13px; color:#666;">This parameter will be permanently added to this category for all suppliers.</p>
        <div style="display:flex; flex-direction:column; gap:14px;">
          <div>
            <label style="display:block; font-size:11px; font-weight:700; color:#555; margin-bottom:4px; text-transform:uppercase;">Parameter Name *</label>
            <input type="text" id="cp-name" placeholder="e.g. Operating Voltage" style="width:100%; padding:8px 12px; border:1px solid #d1d5db; border-radius:4px; font-size:13px; box-sizing:border-box;">
          </div>
          <div style="display:flex; gap:12px;">
            <div style="flex:1;">
              <label style="display:block; font-size:11px; font-weight:700; color:#555; margin-bottom:4px; text-transform:uppercase;">Data Type</label>
              <select id="cp-type" style="width:100%; padding:8px 12px; border:1px solid #d1d5db; border-radius:4px; font-size:13px;">
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean (Yes/No)</option>
                <option value="enum">Enum (Dropdown)</option>
              </select>
            </div>
            <div style="flex:1;">
              <label style="display:block; font-size:11px; font-weight:700; color:#555; margin-bottom:4px; text-transform:uppercase;">Unit (optional)</label>
              <input type="text" id="cp-unit" placeholder="e.g. mm, V, kg" style="width:100%; padding:8px 12px; border:1px solid #d1d5db; border-radius:4px; font-size:13px; box-sizing:border-box;">
            </div>
          </div>
          <div>
            <label style="display:block; font-size:11px; font-weight:700; color:#555; margin-bottom:4px; text-transform:uppercase;">Priority</label>
            <select id="cp-priority" style="width:100%; padding:8px 12px; border:1px solid #d1d5db; border-radius:4px; font-size:13px;">
              <option value="optional">Optional</option>
              <option value="recommended">Recommended</option>
              <option value="required">Required</option>
            </select>
          </div>
          <div id="cp-error" style="display:none; background:#fef2f2; border:1px solid #fecaca; border-radius:4px; padding:8px 12px; font-size:12px; color:#dc2626;"></div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
            <button type="button" id="cp-cancel" style="background:#f1f5f9; border:1px solid #e2e8f0; color:#475569; padding:8px 20px; border-radius:4px; font-size:13px; font-weight:600; cursor:pointer;">Cancel</button>
            <button type="button" id="cp-save" style="background:#007185; border:none; color:#fff; padding:8px 20px; border-radius:4px; font-size:13px; font-weight:700; cursor:pointer;">Save Parameter</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);

    document.getElementById('cp-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    document.getElementById('cp-save').addEventListener('click', async () => {
      const name = document.getElementById('cp-name').value.trim();
      const dataType = document.getElementById('cp-type').value;
      const unit = document.getElementById('cp-unit').value.trim();
      const priority = document.getElementById('cp-priority').value;
      const errEl = document.getElementById('cp-error');

      if (!name) {
        errEl.textContent = 'Parameter name is required.';
        errEl.style.display = '';
        return;
      }

      // Check for duplicates
      const exists = categoryParameters.some(p => p.category_id === catId && p.parameter_name.toLowerCase() === name.toLowerCase());
      if (exists) {
        errEl.textContent = 'A parameter with this name already exists for this category.';
        errEl.style.display = '';
        return;
      }

      const saveBtn = document.getElementById('cp-save');
      saveBtn.textContent = 'Saving…';
      saveBtn.disabled = true;

      const paramSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

      const { data, error } = await supabase.from('category_parameters').insert({
        category_id: catId,
        parameter_name: name,
        parameter_slug: paramSlug,
        data_type: dataType,
        unit: unit || null,
        priority: priority,
        filter_ui: dataType === 'boolean' ? 'toggle' : (dataType === 'number' ? 'min_max' : 'multi_select'),
        facetable: true
      }).select();

      if (error) {
        errEl.textContent = 'Failed to save: ' + error.message;
        errEl.style.display = '';
        saveBtn.textContent = 'Save Parameter';
        saveBtn.disabled = false;
        return;
      }

      // Add to local cache
      if (data && data[0]) categoryParameters.push(data[0]);

      modal.remove();
      renderDynamicParams(catId);
    });
  }

  catSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    const opt = document.querySelector(`#category-datalist option[value="${val}"]`);
    const catId = opt ? opt.dataset.id : null;
    renderDynamicParams(catId);
  });

  // Also fire on 'input' event for datalist auto-complete to trigger immediately
  catSelect.addEventListener('input', (e) => {
    const val = e.target.value;
    const opt = document.querySelector(`#category-datalist option[value="${val}"]`);
    if (opt) {
      const catId = opt.dataset.id;
      renderDynamicParams(catId);
    }
  });



  // Rich Text Editor Logic
  const richDesc = document.getElementById('rich-description');
  // Inject scoped CSS to constrain images inside the rich text editor
  const richStyle = document.createElement('style');
  richStyle.textContent = '#rich-description img { max-width:100% !important; width:auto !important; height:auto !important; display:block; margin:8px 0; border-radius:3px; }';
  document.head.appendChild(richStyle);


  const richWrapper = document.getElementById('rich-editor-wrapper');
  const imgUploadBtn = document.getElementById('rich-desc-img-upload');

  const insertImageAtCursor = (url) => {
    richDesc.focus();
    document.execCommand('insertImage', false, url);
    // Constrain all images in the editor to the container width
    setTimeout(() => {
      richDesc.querySelectorAll('img').forEach(img => {
        img.style.maxWidth  = '100%';
        img.style.width     = 'auto';
        img.style.height    = 'auto';
        img.style.display   = 'block';
        img.style.marginTop = '8px';
        img.style.marginBottom = '8px';
        img.style.borderRadius = '3px';
      });
    }, 10);
  };

  imgUploadBtn.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => insertImageAtCursor(ev.target.result);
      reader.readAsDataURL(file);
    }
  });

  richDesc.addEventListener('dragover', (e) => {
    e.preventDefault();
    richWrapper.style.borderColor = '#007185';
    richWrapper.style.boxShadow = '0 0 0 3px rgba(0, 113, 133, 0.2)';
  });
  
  richDesc.addEventListener('dragleave', (e) => {
    e.preventDefault();
    richWrapper.style.borderColor = 'var(--amz-input-border)';
    richWrapper.style.boxShadow = 'none';
  });

  richDesc.addEventListener('drop', (e) => {
    e.preventDefault();
    richWrapper.style.borderColor = 'var(--amz-input-border)';
    richWrapper.style.boxShadow = 'none';
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => insertImageAtCursor(ev.target.result);
        reader.readAsDataURL(file);
      }
    }
  });

  // ── Visual / HTML source toggle ──
  const htmlSourceEditor = document.getElementById('html-source-editor');
  const btnVisual = document.getElementById('btn-mode-visual');
  const btnHtml = document.getElementById('btn-mode-html');
  const toolbarButtons = document.querySelectorAll('#editor-toolbar > button[onclick], #editor-toolbar > button[style*="flex"]');

  btnHtml?.addEventListener('click', () => {
    // Switch to HTML source mode
    htmlSourceEditor.value = richDesc.innerHTML;
    richDesc.style.display = 'none';
    htmlSourceEditor.style.display = 'block';
    btnHtml.classList.add('active');
    btnVisual.classList.remove('active');
    // Disable formatting buttons
    toolbarButtons.forEach(b => { b.style.opacity = '0.3'; b.style.pointerEvents = 'none'; });
  });

  btnVisual?.addEventListener('click', () => {
    // Switch back to visual mode — apply HTML source
    richDesc.innerHTML = htmlSourceEditor.value;
    richDesc.style.display = 'block';
    htmlSourceEditor.style.display = 'none';
    btnVisual.classList.add('active');
    btnHtml.classList.remove('active');
    // Re-enable formatting buttons
    toolbarButtons.forEach(b => { b.style.opacity = '1'; b.style.pointerEvents = 'auto'; });
  });

  if (prod) {
    const initialName = getCatName(prod.category_id);
    document.getElementById('p-category').value = initialName;
    renderDynamicParams(prod.category_id);
    
    setTimeout(() => {
      if (prod.specs) {
        Object.keys(prod.specs).forEach(k => {
          const paramDef = categoryParameters.find(cp => cp.category_id === prod.category_id && cp.parameter_name === k);
          if (paramDef) {
            const field = document.getElementById(`spec-${paramDef.id}`);
            if (field) field.value = prod.specs[k];
          }
        });
      }
    }, 50);
  }

  // Helper to add a pricing tier
  function addPricingTier(minQty = '', leadTime = '', price = '') {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #eee';
    tr.innerHTML = `
      <td style="padding:4px;"><input type="number" class="amz-form-input tier-qty" style="width:100%; padding:4px;" value="${minQty}"></td>
      <td style="padding:4px;"><input type="number" class="amz-form-input tier-lead" style="width:100%; padding:4px;" value="${leadTime}"></td>
      <td style="padding:4px;"><input type="number" step="any" class="amz-form-input tier-price" style="width:100%; padding:4px;" value="${price}"></td>
      <td style="padding:4px; text-align:center;"><button type="button" class="btn-remove-tier" style="background:none; border:none; color:#e00; cursor:pointer; font-weight:bold;" title="Remove">X</button></td>
    `;
    tr.querySelector('.btn-remove-tier').addEventListener('click', () => tr.remove());
    document.getElementById('pricing-tiers-body').appendChild(tr);
  }

  document.getElementById('btn-add-tier').addEventListener('click', () => addPricingTier());
  
  // Helper to add a packaging layer
  function addPackagingLayer(name = '', l = '', w = '', h = '', weight = '') {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.style.marginBottom = '8px';
    div.innerHTML = `
      <input type="text" class="amz-form-input pack-name" placeholder="Name" style="flex:2; padding:4px;" value="${name}">
      <input type="number" step="any" class="amz-form-input pack-l" placeholder="L (mm)" style="flex:1; padding:4px;" value="${l}">
      <input type="number" step="any" class="amz-form-input pack-w" placeholder="W (mm)" style="flex:1; padding:4px;" value="${w}">
      <input type="number" step="any" class="amz-form-input pack-h" placeholder="H (mm)" style="flex:1; padding:4px;" value="${h}">
      <input type="number" step="any" class="amz-form-input pack-weight" placeholder="kg" style="flex:1; padding:4px;" value="${weight}">
      <button type="button" class="btn-remove-pack" style="background:none; border:none; color:#e00; cursor:pointer; font-weight:bold;" title="Remove">X</button>
    `;
    div.querySelector('.btn-remove-pack').addEventListener('click', () => div.remove());
    document.getElementById('packaging-layers-container').appendChild(div);
  }

  document.getElementById('btn-add-packaging-layer').addEventListener('click', () => addPackagingLayer());

  // Initialization for edit mode
  if (prod) {
    if (prod.pricing_tiers && prod.pricing_tiers.length) {
      prod.pricing_tiers.forEach(t => addPricingTier(t.min_quantity, t.lead_time_days, t.unit_price));
    } else {
      addPricingTier(); // at least one default
    }
    
    if (prod.packaging && prod.packaging.length) {
      prod.packaging.forEach(p => addPackagingLayer(p.name, p.l, p.w, p.h, p.weight));
    } else {
      addPackagingLayer('Single Unit');
    }
  } else {
    // defaults
    addPricingTier(1, 14, '');
    addPackagingLayer('Single Unit');
  }

  // Handle Form Submission
  // NOTE: The Save button is outside <form> (fixed footer), so we use a click
  // listener on the button directly instead of the form's submit event.
  const saveBtn = document.getElementById('btn-save-product');
  saveBtn.addEventListener('click', async () => {
    const btn = saveBtn;
    const ogText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    // Wrap everything so a crash re-enables the button
    try {

    const catId = catSelect.value; // It could be value (text) or we need the raw id
    // Resolve catId properly
    let finalCatId = catId;
    const matchedOpt = document.querySelector(`#category-datalist option[value="${catId}"]`);
    if (matchedOpt) finalCatId = matchedOpt.dataset.id;
    else if (prod) finalCatId = prod.category_id; // Default back if invalid text

    const paramsForCatSelf = categoryParameters.filter(p => p.category_id === finalCatId);
    const resolvedCat = categories.find(c => c.id === finalCatId);
    const parentCatId = resolvedCat?.parent_id;
    const paramsFromParent = parentCatId ? categoryParameters.filter(p => p.category_id === parentCatId) : [];
    // Deduplicate: child overrides parent
    const seenParamNames = new Set(paramsForCatSelf.map(p => p.parameter_name));
    const paramsForCat = [...paramsForCatSelf, ...paramsFromParent.filter(p => !seenParamNames.has(p.parameter_name))];
    
    let specsPayload = prod?.specs ? JSON.parse(JSON.stringify(prod.specs)) : {};
    paramsForCat.forEach(p => {
      const el = document.getElementById(`spec-${p.id}`);
      if(el) {
        let val = el.value;
        if (p.data_type === 'number') val = Number(val);
        if (p.data_type === 'boolean') val = val === 'true';
        specsPayload[p.parameter_name] = val;
      }
    });

    // Collect pricing tiers
    const tiers = [];
    document.querySelectorAll('#pricing-tiers-body tr').forEach(tr => {
       const qty = Number(tr.querySelector('.tier-qty').value);
       const lead = Number(tr.querySelector('.tier-lead').value);
       const price = Number(tr.querySelector('.tier-price').value);
       if (qty > 0 && price >= 0) {
          tiers.push({ min_quantity: qty, lead_time_days: lead, unit_price: price });
       }
    });

    // Collect packaging layers
    const pack = [];
    document.querySelectorAll('#packaging-layers-container > div').forEach(div => {
       const name = div.querySelector('.pack-name').value;
       const l = Number(div.querySelector('.pack-l').value);
       const w = Number(div.querySelector('.pack-w').value);
       const h = Number(div.querySelector('.pack-h').value);
       const weight = Number(div.querySelector('.pack-weight').value);
       if (name) {
          pack.push({ name, l, w, h, weight });
       }
    });

    const htmlSrcEl = document.getElementById('html-source-editor');
    const richDescEl = document.getElementById('rich-description');
    const richDesc = (htmlSrcEl && htmlSrcEl.style.display !== 'none') ? htmlSrcEl.value : richDescEl.innerHTML;
    const applications = document.getElementById('p-applications')?.value || '';
    const internalSku = document.getElementById('internal-sku').value;

    const base_price = tiers.length ? tiers[0].unit_price : 0;

    // Store applications inside specs (not a top-level products column)
    if (applications) specsPayload.applications = applications;

    const payload = {
      supplier_id: factoryRecord.id,
      category_id: finalCatId,
      mpn: document.getElementById('p-mpn').value || internalSku,
      description: document.getElementById('p-desc').value,
      stock_quantity: parseInt(document.getElementById('p-stock-qty')?.value || '0', 10),
      base_price: base_price,
      pricing_tiers: tiers,
      packaging: pack,
      rich_description: richDesc,
      specs: specsPayload
    };

    let prodId = null;
    
    if (prod) {
      const { error: prodErr } = await supabase.from('products').update(payload).eq('id', prod.id);
      if (prodErr) { alert("Failed to update part: " + prodErr.message); btn.textContent = ogText; btn.disabled = false; return; }
      prodId = prod.id;
    } else {
      const { data: prodData, error: prodErr } = await supabase.from('products').insert(payload).select();
      if (prodErr) { alert("Failed to publish part: " + prodErr.message); btn.textContent = ogText; btn.disabled = false; return; }
      prodId = prodData[0].id;
    }

    // ── Media Upload ────────────────────────────────────────────────────────────
    // Collect all file inputs
    const mainImageFiles  = document.getElementById('p-img-file').files;
    const extraImageFiles = document.getElementById('p-extra-imgs').files;
    const model3dFile     = document.getElementById('p-3d-model').files[0];
    const drawing2dFile   = document.getElementById('p-2d-drawing').files[0];
    const videoFile       = document.getElementById('p-video').files[0];
    const pdfFile         = document.getElementById('p-pdf-file').files[0];

    const uploadErrors = [];
    let firstImageUrl = null; // track to patch product.image_url

    /**
     * Upload a single file to the product_assets Supabase Storage bucket,
     * register the row in product_assets table, and (for images) patch specs.images.
     * Returns the public URL on success, null on failure.
     *
     * Uses direct Supabase Storage upload (supports files up to 5GB).
     */
    async function uploadAsset(file, assetType) {
      if (!file) return null;
      const fileExt = file.name.split('.').pop().toLowerCase();
      const safeType = assetType.replace(/[^a-z0-9_]/g, '_');
      const fileName = `${prodId}_${safeType}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `${factoryRecord.id}/${fileName}`;

      let publicUrl = null;
      try {
        // Direct upload to Supabase Storage (no size limit from Netlify proxy)
        const { data, error: uploadErr } = await supabase.storage
          .from('product_assets')
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600'
          });

        if (uploadErr) {
          // If direct upload fails due to RLS, fall back to Netlify proxy for small files
          if (file.size < 5 * 1024 * 1024) {
            console.warn(`[Upload] Direct upload failed (${uploadErr.message}), trying proxy...`);
            const fileBase64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result.split(',')[1]);
              reader.onerror = error => reject(error);
              reader.readAsDataURL(file);
            });
            const res = await fetch('/.netlify/functions/storage-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileBase64, fileName, filePath, contentType: file.type || 'application/octet-stream', bucket: 'product_assets' })
            });
            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || 'Proxy upload failed');
            publicUrl = result.publicUrl;
          } else {
            throw new Error(`File too large for proxy upload. Direct upload error: ${uploadErr.message}`);
          }
        } else {
          // Success — get public URL
          const { data: publicData } = supabase.storage.from('product_assets').getPublicUrl(filePath);
          publicUrl = publicData.publicUrl;
        }
      } catch (uploadError) {
        console.error(`[Upload FAIL] [${assetType}] File: ${file.name}`);
        console.error(`  → Message: `, uploadError.message);
        console.error(`  → Error:   `, uploadError);
        uploadErrors.push(`${file.name}: ${uploadError.message}`);
        return null;
      }

      // Register in product_assets table
      const { error: assetRowErr } = await supabase.from('product_assets').insert({
        product_id: prodId,
        asset_type: assetType,
        url: publicUrl
      });
      if (assetRowErr) {
        console.warn(`[product_assets table] Insert failed: ${assetRowErr.message}`);
        // Non-fatal — file is still in storage, just not registered in the table
      }

      // For images: update specs.images array and track first image for image_url
      if (assetType === 'image') {
        const { data: cData } = await supabase.from('products').select('specs').eq('id', prodId).single();
        const currentSpecs = cData?.specs || {};
        currentSpecs.images = [publicUrl, ...(currentSpecs.images || [])];
        await supabase.from('products').update({ specs: currentSpecs }).eq('id', prodId);
        if (!firstImageUrl) firstImageUrl = publicUrl;
      }

      return publicUrl;
    }

    try {
      const hasAnyFile = mainImageFiles.length || extraImageFiles.length ||
                         model3dFile || drawing2dFile || videoFile || pdfFile;

      if (hasAnyFile) btn.textContent = 'Uploading assets...';

      // 1. Main product image (maps to catalog display)
      for (let i = 0; i < mainImageFiles.length; i++) {
        await uploadAsset(mainImageFiles[i], 'image');
      }

      // 2. Extra gallery images
      for (let i = 0; i < extraImageFiles.length; i++) {
        await uploadAsset(extraImageFiles[i], 'image');
      }

      // 3. Technical datasheet PDF
      if (pdfFile) await uploadAsset(pdfFile, 'datasheet');

      // 4. 3D model (STEP/STL/IGES)
      if (model3dFile) await uploadAsset(model3dFile, '3d_model');

      // 5. 2D engineering drawing (PDF/DXF/DWG)
      if (drawing2dFile) await uploadAsset(drawing2dFile, '2d_drawing');

      // 6. Product video (MP4)
      if (videoFile) await uploadAsset(videoFile, 'video');

      // Patch product.image_url with the first uploaded image
      // (this is what the marketplace catalog and cart read directly)
      if (firstImageUrl) {
        await supabase.from('products').update({ image_url: firstImageUrl }).eq('id', prodId);
      }

      if (uploadErrors.length > 0) {
        alert('Product saved, but some files failed to upload:\n\n' + uploadErrors.join('\n') +
              '\n\nThis is usually a storage permission issue. Contact the platform admin.');
      }

    } catch (e) {
      console.error('Upload error:', e);
    }

      loadCatalogTab();
    } catch (globalErr) {
      console.error('Save error:', globalErr);
      alert('An unexpected error occurred. Check the browser console for details.');
      btn.textContent = ogText;
      btn.disabled = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ORDER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
async function loadOrdersTab() {
  const routing = document.getElementById('supplier-content-routing');
  
  routing.innerHTML = `
    <div class="sp-container">
      <h1 class="sp-page-title">Orders & RFQs</h1>
      <div class="sp-table-toolbar">
        <div class="sp-search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" placeholder="Search by Order ID, MPN, or customer...">
        </div>
      </div>
      <div id="orders-grid"></div>
    </div>
  `;

  // Fetch from rfq_history where supplier_id matches our factoryRecord.id
  const { data, error } = await supabase.from('rfq_history').select('*').order('created_at', { ascending: false });
  
  const grid = document.getElementById('orders-grid');
  
  if (error) {
     grid.innerHTML = `<div style="padding:40px; text-align:center; color:red;">Failed to load orders: ${error.message}</div>`;
     return;
  }

  // Filter client side in case of JSON query issues
  const myOrders = (data || []).filter(row => {
     return row.rfq_data && String(row.rfq_data.supplier_id) === String(factoryRecord.id);
  });

  if (myOrders.length === 0) {
    grid.innerHTML = `<div class="sp-table-wrapper"><div class="sp-empty-state"><div class="sp-empty-title">No active orders</div><div class="sp-empty-sub">Once a customer submits an RFQ, it will appear here.</div></div></div>`;
    return;
  }

  // Render Table
  let html = `
    <div class="sp-table-wrapper"><table class="sp-table">
      <thead>
        <tr>
          <th>Order Date</th>
          <th>Product / MPN</th>
          <th>Quantity</th>
          <th>Total Value</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  myOrders.forEach(o => {
      const rd = o.rfq_data || {};
      const statusLabel = o.status === 'submitted' ? 'Action Needed' : o.status;
      const statusColor = o.status === 'submitted' ? '#c40000' : '#10b981';
      
      html += `
        <tr>
          <td style="font-size:12px; color:#555;">${new Date(o.created_at).toLocaleDateString()}</td>
          <td>
             <div style="font-weight:600; color:var(--amz-link);">${rd.mpn || 'Unknown Component'}</div>
             <div style="font-size:11px; color:#666;">Type: ${rd.type || 'Standard RFQ'}</div>
          </td>
          <td>${rd.quantity || 1}</td>
          <td>$${(rd.quantity * (rd.unit_price || 0)).toFixed(2) === '0.00' ? '--' : (rd.quantity * rd.unit_price).toFixed(2)}</td>
          <td><span style="color:${statusColor}; font-weight:600; font-size:12px; text-transform:capitalize;">${statusLabel.replace('_', ' ')}</span></td>
          <td>
             <select class="amz-form-input status-dropdown" data-id="${o.id}" style="font-size:11px; padding:4px; height:auto; width:120px; display:inline-block;">
                <option value="submitted" ${o.status==='submitted'?'selected':''}>Pending</option>
                <option value="quoted" ${o.status==='quoted'?'selected':''}>Quote Sent</option>
                <option value="accepted" ${o.status==='accepted'?'selected':''}>Accepted</option>
                <option value="shipped" ${o.status==='shipped'?'selected':''}>Shipped</option>
             </select>
             <button class="amz-btn btn-update-status" data-id="${o.id}" style="padding:4px 8px; margin-left:4px;">Update</button>
          </td>
        </tr>
      `;
  });

  html += `</tbody></table></div>`;
  grid.innerHTML = html;

  // Bind update buttons
  document.querySelectorAll('.btn-update-status').forEach(btn => {
      btn.addEventListener('click', async (e) => {
         const id = e.target.dataset.id;
         const sel = document.querySelector(`.status-dropdown[data-id="${id}"]`);
         const newStatus = sel.value;
         
         e.target.textContent = '...';
         e.target.disabled = true;

         const { error } = await supabase.from('rfq_history').update({ status: newStatus }).eq('id', id);
         if(error) {
            alert('Failed to update: '+error.message);
         } else {
            e.target.style.background = '#10b981';
            e.target.style.color = '#fff';
            e.target.textContent = 'Saved';
            setTimeout(() => {
               e.target.style.background = '';
               e.target.style.color = '';
               e.target.textContent = 'Update';
               e.target.disabled = false;
            }, 2000);
         }
      });
  });
}
