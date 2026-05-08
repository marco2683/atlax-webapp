/**
 * Supplier Onboarding Wizard — Bilingual EN/ZH, 6-step
 */
import { supabase } from './supabase.js';
import { t, getLang, setLang } from './onboarding-i18n.js';
import { getAgreementHTML } from './onboarding-agreement.js';

const STEPS = () => [
  { id:'company',   icon:'🏢', title: t('step1title') },
  { id:'licenses',  icon:'📄', title: t('step2title') },
  { id:'addresses', icon:'📍', title: t('step3title') },
  { id:'contacts',  icon:'👤', title: t('step4title') },
  { id:'banking',   icon:'🏦', title: t('step5title') },
  { id:'agreement', icon:'✍️', title: t('step6title') },
];

let currentStep = 0, formData = {}, supplierId = null, userId = null;

export function launchOnboardingWizard(user, rec) {
  userId = user.id;
  const m = user.user_metadata || {};
  formData = {
    name: rec?.name||m.company||'', segment: rec?.segment||'OEM',
    trading_name: rec?.trading_name||'', registration_number: rec?.registration_number||'',
    tax_id: rec?.tax_id||'', industry: rec?.industry||'', year_established: rec?.year_established||'',
    employee_count: rec?.employee_count||'', website: rec?.website||'', description: rec?.description||'',
    country: rec?.country||'',
    registered_address: rec?.registered_address||{}, factory_address: rec?.factory_address||{},
    warehouse_address: rec?.warehouse_address||{},
    legal_representatives: rec?.legal_representatives||[{name:m.full_name||'',title:'',email:user.email,phone:'',is_primary:true}],
    key_contacts: rec?.key_contacts||[],
    banking_info: rec?.banking_info||{},
    certifications: rec?.certifications||[],
  };
  supplierId = rec?.id||null;
  currentStep = rec?.onboarding_step||0;
  renderWizard();
}

/* ── Shell ────────────────────────────────────── */
function renderWizard() {
  const steps = STEPS();
  document.body.innerHTML = `
    <div class="ob-wizard">
      <div class="ob-sidebar">
        <div class="ob-logo">
          <img src="/logos/atlasdt-logo-full.svg" alt="AtlasDT" style="height:36px">
          <div class="ob-logo-sub">${t('onboardingSub')}</div>
        </div>
        <div class="ob-steps" id="ob-steps-nav"></div>
        <div class="ob-sidebar-footer">
          <button class="ob-btn-ghost" id="ob-lang-toggle">${t('langToggle')}</button>
          <button class="ob-btn-ghost" id="ob-save-exit">${t('saveExit')}</button>
        </div>
      </div>
      <div class="ob-main">
        <div class="ob-progress-bar"><div class="ob-progress-fill" id="ob-progress-fill"></div></div>
        <div class="ob-content" id="ob-content"></div>
        <div class="ob-actions">
          <button class="ob-btn-secondary" id="ob-prev" style="display:none;">${t('back')}</button>
          <div style="flex:1;"></div>
          <button class="ob-btn-primary" id="ob-next">${t('continue')}</button>
        </div>
      </div>
    </div>`;
  renderStepsNav(); renderStepContent(); bindNavButtons();
}

function renderStepsNav() {
  const steps = STEPS();
  document.getElementById('ob-steps-nav').innerHTML = steps.map((s,i) => `
    <div class="ob-step-item ${i===currentStep?'active':''} ${i<currentStep?'done':''}" data-step="${i}">
      <div class="ob-step-num">${i<currentStep?'✓':s.icon}</div>
      <div class="ob-step-label">${s.title}</div>
    </div>`).join('');
  document.querySelectorAll('.ob-step-item').forEach(el => {
    el.addEventListener('click', () => { const i=+el.dataset.step; if(i<=currentStep){collectCurrentData();currentStep=i;renderStepContent();renderStepsNav();} });
  });
  document.getElementById('ob-progress-fill').style.width = `${((currentStep+1)/steps.length)*100}%`;
}

function bindNavButtons() {
  document.getElementById('ob-prev').addEventListener('click', () => { collectCurrentData(); if(currentStep>0){currentStep--;renderStepContent();renderStepsNav();} });
  document.getElementById('ob-next').addEventListener('click', async () => {
    if(!validateCurrentStep()) return;
    collectCurrentData();
    if(currentStep<STEPS().length-1){ currentStep++; await saveProgress(); renderStepContent(); renderStepsNav(); }
    else { await finalizeOnboarding(); }
  });
  document.getElementById('ob-save-exit')?.addEventListener('click', async () => { collectCurrentData(); await saveProgress(); window.location.reload(); });
  document.getElementById('ob-lang-toggle')?.addEventListener('click', () => {
    collectCurrentData();
    setLang(getLang()==='en'?'zh':'en');
    renderWizard();
  });
}

function renderStepContent() {
  const steps = STEPS();
  const c = document.getElementById('ob-content');
  const prev = document.getElementById('ob-prev');
  const next = document.getElementById('ob-next');
  prev.style.display = currentStep===0?'none':'';
  next.textContent = currentStep===steps.length-1 ? t('signComplete') : t('continue');
  const R = [renderCompanyStep,renderLicensesStep,renderAddressesStep,renderContactsStep,renderBankingStep,renderAgreementStep];
  c.innerHTML = `<h2 class="ob-step-title">${steps[currentStep].icon} ${steps[currentStep].title}</h2>` + R[currentStep]();
  c.scrollTop = 0;
  // banking country/currency change handler — re-render on change
  if(currentStep===4) {
    const reRenderBanking = () => { collectCurrentData(); c.innerHTML = `<h2 class="ob-step-title">${steps[4].icon} ${steps[4].title}</h2>` + renderBankingStep(); bindBankingHandlers(); };
    const bindBankingHandlers = () => { document.getElementById('bk-country')?.addEventListener('change', reRenderBanking); document.getElementById('bk-currency')?.addEventListener('change', reRenderBanking); };
    bindBankingHandlers();
  }
}

/* ── Step Renderers ───────────────────────────── */
const req = `<span class="ob-req">*</span>`;
function renderCompanyStep() {
  const indOpts = [['indElec'],['indCNC'],['indPlastic'],['indPCB'],['indMetal'],['indPack'],['indChem'],['indTextile'],['indOther']];
  const segOpts = [['OEM','segOEM'],['DISTRIBUTOR','segDist'],['CM','segCM']];
  const empOpts = ['1-10','11-50','51-200','201-500','501-1000','1000+'];
  return `<div class="ob-form-grid">
    <div class="ob-field ob-full"><label>${t('legalName')} ${req}</label><input type="text" id="f-name" value="${esc(formData.name)}"></div>
    <div class="ob-field"><label>${t('tradingName')}</label><input type="text" id="f-trading" value="${esc(formData.trading_name)}"></div>
    <div class="ob-field"><label>${t('regNo')} ${req}</label><input type="text" id="f-reg-num" value="${esc(formData.registration_number)}"></div>
    <div class="ob-field"><label>${t('taxId')}</label><input type="text" id="f-tax-id" value="${esc(formData.tax_id)}" placeholder="${t('optional')}"></div>
    <div class="ob-field"><label>${t('country')} ${req}</label><input type="text" id="f-country" value="${esc(formData.country)}"></div>
    <div class="ob-field"><label>${t('industry')} ${req}</label><select id="f-industry">${indOpts.map(([k])=>{const v=t(k);return`<option value="${v}" ${formData.industry===v?'selected':''}>${v}</option>`;}).join('')}</select></div>
    <div class="ob-field"><label>${t('bizFocus')}</label><select id="f-segment">${segOpts.map(([val,k])=>`<option value="${val}" ${formData.segment===val?'selected':''}>${t(k)}</option>`).join('')}</select></div>
    <div class="ob-field"><label>${t('yearEst')}</label><input type="number" id="f-year" value="${formData.year_established||''}" min="1900" max="2030"></div>
    <div class="ob-field"><label>${t('employees')}</label><select id="f-employees">${empOpts.map(v=>`<option value="${v}" ${formData.employee_count===v?'selected':''}>${v}</option>`).join('')}</select></div>
    <div class="ob-field"><label>${t('website')}</label><input type="url" id="f-website" value="${esc(formData.website)}"></div>
    <div class="ob-field ob-full"><label>${t('companyDesc')}</label><textarea id="f-desc" rows="3" placeholder="${t('companyDescPh')}">${esc(formData.description)}</textarea></div>
  </div>`;
}

function renderLicensesStep() {
  setTimeout(() => {
    ['f-license','f-export-license'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', function() {
        const zone = this.closest('.ob-upload-zone');
        const txt = zone?.querySelector('.ob-upload-text');
        if(this.files.length && txt) { txt.textContent = `${t('fileUploaded')}: ${this.files[0].name}`; zone.style.borderColor='#10B981'; }
      });
    });
  }, 100);
  return `<p class="ob-hint">${t('licHint')}</p><div class="ob-form-grid">
    <div class="ob-field ob-full"><label>${t('bizLicense')} ${req}</label>
      <div class="ob-upload-zone" id="zone-license"><input type="file" id="f-license" accept=".pdf,.jpg,.jpeg,.png" style="display:none;">
        <div class="ob-upload-inner" onclick="document.getElementById('f-license').click()"><div class="ob-upload-icon">📄</div><div class="ob-upload-text">${t('uploadBizLic')}</div><div class="ob-upload-hint">${t('fileHint')}</div></div></div></div>
    <div class="ob-field ob-full"><label>${t('exportLicense')}</label>
      <div class="ob-upload-zone" id="zone-export"><input type="file" id="f-export-license" accept=".pdf,.jpg,.jpeg,.png" style="display:none;">
        <div class="ob-upload-inner" onclick="document.getElementById('f-export-license').click()"><div class="ob-upload-icon">📋</div><div class="ob-upload-text">${t('uploadExport')}</div><div class="ob-upload-hint">${t('optional')}</div></div></div></div>
    <div class="ob-field ob-full"><label>${t('certifications')}</label><p class="ob-hint">${t('certHint')}</p>
      <div class="ob-cert-header" style="display:grid;grid-template-columns:1fr 1fr 140px 36px;gap:8px;font-size:12px;font-weight:600;text-transform:uppercase;color:#94A3B8;padding:4px 0;border-bottom:1px solid rgba(148,163,184,0.2);margin-bottom:8px;">
        <span>${t('certType')}</span><span>${t('certNo')}</span><span>${t('certExpiry')}</span><span></span></div>
      <div id="cert-list"></div><button type="button" class="ob-btn-ghost ob-add-cert" onclick="window._addCertRow()">${t('addCert')}</button></div>
  </div>`;
}

function renderAddressesStep() {
  const ab = (pfx,labelKey,data) => `<div class="ob-address-block"><h3 class="ob-sub-title">${t(labelKey)}</h3><div class="ob-form-grid">
    <div class="ob-field ob-full"><label>${t('addrLine1')}</label><input type="text" id="${pfx}-line1" value="${esc(data.line1||'')}" placeholder="${t('addrLine1Ph')}"></div>
    <div class="ob-field ob-full"><label>${t('addrLine2')}</label><input type="text" id="${pfx}-line2" value="${esc(data.line2||'')}" placeholder="${t('addrLine2Ph')}"></div>
    <div class="ob-field"><label>${t('city')}</label><input type="text" id="${pfx}-city" value="${esc(data.city||'')}"></div>
    <div class="ob-field"><label>${t('stateProvince')}</label><input type="text" id="${pfx}-state" value="${esc(data.state||'')}"></div>
    <div class="ob-field"><label>${t('postalCode')}</label><input type="text" id="${pfx}-zip" value="${esc(data.postal_code||'')}"></div>
    <div class="ob-field"><label>${t('countryRegion')}</label><input type="text" id="${pfx}-country" value="${esc(data.country||formData.country||'')}"></div>
  </div></div>`;

  setTimeout(() => {
    document.getElementById('same-as-legal')?.addEventListener('change', function() {
      if(this.checked) { ['line1','line2','city','state','zip','country'].forEach(f => { const s=document.getElementById(`reg-${f}`); const d=document.getElementById(`fac-${f}`); if(s&&d) d.value=s.value; }); }
    });
    document.getElementById('same-as-factory')?.addEventListener('change', function() {
      if(this.checked) { ['line1','line2','city','state','zip','country'].forEach(f => { const s=document.getElementById(`fac-${f}`); const d=document.getElementById(`wh-${f}`); if(s&&d) d.value=s.value; }); }
    });
  }, 100);

  return ab('reg','regAddr',formData.registered_address)+
    `<label class="ob-checkbox"><input type="checkbox" id="same-as-legal"> ${t('sameAsLegal')}</label>`+
    ab('fac','facAddr',formData.factory_address)+
    `<label class="ob-checkbox"><input type="checkbox" id="same-as-factory"> ${t('sameAsFactory')}</label>`+
    ab('wh','whAddr',formData.warehouse_address);
}

function renderContactsStep() {
  const r=formData.legal_representatives[0]||{}, c0=formData.key_contacts[0]||{};
  const titleOpts = ['CEO','Managing Director','Director','General Manager','COO','CFO','Sales Manager','Procurement Manager','Other'];
  const titleSel = (id, val) => `<select id="${id}"><option value="" disabled ${!val?'selected':''}>${t('titlePh')}</option>${titleOpts.map(o=>`<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}</select>`;
  return `<h3 class="ob-sub-title">${t('legalRep')}</h3><div class="ob-form-grid">
    <div class="ob-field"><label>${t('fullName')} ${req}</label><input type="text" id="lr-name" value="${esc(r.name||'')}"></div>
    <div class="ob-field"><label>${t('titlePosition')} ${req}</label>${titleSel('lr-title', r.title)}</div>
    <div class="ob-field"><label>${t('email')} ${req}</label><input type="email" id="lr-email" value="${esc(r.email||'')}"></div>
    <div class="ob-field"><label>${t('phone')} ${req}</label><input type="tel" id="lr-phone" value="${esc(r.phone||'')}" placeholder="+86 13800138000" pattern="^\\+?[0-9][0-9\\s\\-()]{5,24}$"></div>
  </div><h3 class="ob-sub-title" style="margin-top:32px;">${t('salesContact')}</h3><div class="ob-form-grid">
    <div class="ob-field"><label>${t('fullName')}</label><input type="text" id="cc-name" value="${esc(c0.name||'')}"></div>
    <div class="ob-field"><label>${t('titlePosition')}</label>${titleSel('cc-title', c0.title)}</div>
    <div class="ob-field"><label>${t('email')}</label><input type="email" id="cc-email" value="${esc(c0.email||'')}"></div>
    <div class="ob-field"><label>${t('phone')}</label><input type="tel" id="cc-phone" value="${esc(c0.phone||'')}" placeholder="+86 13800138000" pattern="^\\+?[0-9][0-9\\s\\-()]{5,24}$"></div>
  </div>
  <h3 class="ob-sub-title" style="margin-top:32px;">${t('teamTitle')}</h3>
  <p class="ob-hint">${t('teamHint')}</p>
  <div class="ob-cert-header" style="display:grid;grid-template-columns:1fr 1fr 1fr 36px;gap:8px;font-size:12px;font-weight:600;text-transform:uppercase;color:#94A3B8;padding:4px 0;border-bottom:1px solid rgba(148,163,184,0.2);margin-bottom:8px;">
    <span>${t('teamName')}</span><span>${t('teamEmail')}</span><span>${t('teamRole')}</span><span></span></div>
  <div id="team-list"></div>
  <button type="button" class="ob-btn-ghost" onclick="window._addTeamRow()">${t('teamAdd')}</button>`;
}

function renderBankingStep() {
  const b = formData.banking_info;
  const bc = b.bank_country||'CN';
  const countryOpts = [['CN','bankCN'],['HK','bankHK'],['SG','bankSG'],['MY','bankMY'],['OTHER','bankOther']];
  const curOpts = [['CNY','curCNY'],['USD','curUSD'],['HKD','curHKD'],['SGD','curSGD'],['MYR','curMYR'],['AUD','curAUD'],['EUR','curEUR'],['OTHER','curOther']];

  let fields = `<p class="ob-hint">${t('bankHint')}</p><div class="ob-form-grid">
    <div class="ob-field ob-full"><label>${t('bankCountry')} ${req}</label>
      <select id="bk-country">${countryOpts.map(([v,k])=>`<option value="${v}" ${bc===v?'selected':''}>${t(k)}</option>`).join('')}</select></div>
    <div class="ob-field"><label>${t('bankName')} ${req}</label><input type="text" id="bk-bank" value="${esc(b.bank_name||'')}" placeholder="${t('bankNamePh')}"></div>
    <div class="ob-field"><label>${t('branchName')} ${req}</label><input type="text" id="bk-branch" value="${esc(b.branch_name||'')}" placeholder="${t('branchNamePh')}"></div>
    <div class="ob-field ob-full"><label>${t('acctName')} ${req}</label><input type="text" id="bk-holder" value="${esc(b.account_name||'')}" placeholder="${t('acctNamePh')}"></div>
    <div class="ob-field"><label>${t('acctNumber')} ${req}</label><input type="text" id="bk-acct" value="${esc(b.account_number||'')}"></div>
    <div class="ob-field"><label>${t('swiftCode')} ${req}</label><input type="text" id="bk-swift" value="${esc(b.swift_bic||'')}" placeholder="${t('swiftPh')}"></div>`;

  // China-specific: CNAPS
  if(bc==='CN') fields += `<div class="ob-field"><label>${t('cnapsCode')}</label><input type="text" id="bk-cnaps" value="${esc(b.cnaps_code||'')}" placeholder="${t('cnapsPh')}"></div>`;
  // Singapore: bank code + branch code
  if(bc==='SG') fields += `<div class="ob-field"><label>${t('bankCode')}</label><input type="text" id="bk-bankcode" value="${esc(b.bank_code||'')}" placeholder="${t('bankCodePh')}"></div>
    <div class="ob-field"><label>${t('branchCode')}</label><input type="text" id="bk-branchcode" value="${esc(b.branch_code||'')}" placeholder="${t('branchCodePh')}"></div>`;
  // Malaysia: bank code
  if(bc==='MY') fields += `<div class="ob-field"><label>${t('bankCode')}</label><input type="text" id="bk-bankcode" value="${esc(b.bank_code||'')}" placeholder="${t('bankCodePh')}"></div>`;
  // Other/international: IBAN + routing
  if(bc==='OTHER') fields += `<div class="ob-field"><label>${t('iban')}</label><input type="text" id="bk-iban" value="${esc(b.iban||'')}" placeholder="${t('ibanPh')}"></div>
    <div class="ob-field"><label>${t('routingNo')}</label><input type="text" id="bk-routing" value="${esc(b.routing_number||'')}" placeholder="${t('routingPh')}"></div>`;

  // Common fields for all regions
  fields += `<div class="ob-field ob-full"><label>${t('benefAddr')} ${req}</label><input type="text" id="bk-benef-addr" value="${esc(b.beneficiary_address||'')}" placeholder="${t('benefAddrPh')}"></div>
    <div class="ob-field ob-full"><label>${t('bankAddr')} ${req}</label><input type="text" id="bk-bank-addr" value="${esc(b.bank_address||'')}" placeholder="${t('bankAddrPh')}"></div>
    <div class="ob-field"><label>${t('currency')} ${req}</label><select id="bk-currency">${curOpts.map(([v,k])=>`<option value="${v}" ${(b.currency||'CNY')===v?'selected':''}>${t(k)}</option>`).join('')}</select></div>
    ${(b.currency==='OTHER')?`<div class="ob-field"><label>${t('curOtherLabel')}</label><input type="text" id="bk-currency-other" value="${esc(b.currency_other||'')}" placeholder="${t('curOtherPh')}"></div>`:''}
  </div>`;
  return fields;
}

function renderAgreementStep() {
  return `<div class="ob-agreement-box"><h3>${t('agreementTitle')}</h3>
    <div class="ob-agreement-scroll" id="agreement-text">${getAgreementHTML()}</div></div>
    <div class="ob-form-grid" style="margin-top:24px;">
      <div class="ob-field ob-full"><label class="ob-checkbox"><input type="checkbox" id="agree-terms" required> ${t('agreeCheckbox')} ${req}</label></div>
      <div class="ob-field"><label>${t('sigName')} ${req}</label><input type="text" id="sig-name" value="${esc((formData.legal_representatives[0]||{}).name||'')}" placeholder="${t('sigNamePh')}"></div>
      <div class="ob-field"><label>${t('sigDate')}</label><input type="text" id="sig-date" value="${new Date().toLocaleDateString('en-GB')}" readonly style="opacity:0.7;"></div>
      <div class="ob-field ob-full"><label>${t('sigDigital')} ${req}</label><input type="text" id="sig-signature" placeholder="${t('sigDigitalPh')}" class="ob-signature-input"></div>
    </div>`;
}

/* ── Data Collection ──────────────────────────── */
function collectCurrentData() {
  const v = id => document.getElementById(id)?.value?.trim()||'';
  switch(currentStep) {
    case 0:
      Object.assign(formData, {name:v('f-name'),trading_name:v('f-trading'),registration_number:v('f-reg-num'),tax_id:v('f-tax-id'),country:v('f-country'),industry:v('f-industry'),segment:v('f-segment'),year_established:parseInt(v('f-year'))||null,employee_count:v('f-employees'),website:v('f-website'),description:v('f-desc')});
      break;
    case 2:
      ['reg','fac','wh'].forEach((p,i) => { const k=['registered_address','factory_address','warehouse_address'][i]; formData[k]={line1:v(`${p}-line1`),line2:v(`${p}-line2`),city:v(`${p}-city`),state:v(`${p}-state`),postal_code:v(`${p}-zip`),country:v(`${p}-country`)}; });
      break;
    case 3:
      formData.legal_representatives=[{name:v('lr-name'),title:v('lr-title'),email:v('lr-email'),phone:v('lr-phone'),is_primary:true}];
      const cc={name:v('cc-name'),title:v('cc-title'),email:v('cc-email'),phone:v('cc-phone')};
      formData.key_contacts=cc.name?[cc]:[];
      // Collect team member rows
      formData._team_members = [];
      document.querySelectorAll('.ob-team-row').forEach(row => {
        const tm = { full_name: row.querySelector('.team-name')?.value?.trim()||'', email: row.querySelector('.team-email')?.value?.trim()||'', role: row.querySelector('.team-role')?.value||'viewer' };
        if(tm.email) formData._team_members.push(tm);
      });
      break;
    case 4:
      formData.banking_info = {
        bank_country:v('bk-country'), bank_name:v('bk-bank'), branch_name:v('bk-branch'),
        account_name:v('bk-holder'), account_number:v('bk-acct'), swift_bic:v('bk-swift'),
        cnaps_code:v('bk-cnaps'), bank_code:v('bk-bankcode'), branch_code:v('bk-branchcode'),
        iban:v('bk-iban'), routing_number:v('bk-routing'),
        beneficiary_address:v('bk-benef-addr'), bank_address:v('bk-bank-addr'), currency:v('bk-currency'),
        currency_other:v('bk-currency-other'),
      };
      break;
  }
}

function validateCurrentStep() {
  const v = id => document.getElementById(id)?.value?.trim()||'';
  let m=[];
  switch(currentStep) {
    case 0: if(!v('f-name'))m.push(t('legalName')); if(!v('f-reg-num'))m.push(t('regNo')); if(!v('f-country'))m.push(t('country')); break;
    case 3:
      if(!v('lr-name'))m.push(t('fullName')); if(!v('lr-title'))m.push(t('titlePosition')); if(!v('lr-email'))m.push(t('email'));
      const ph = v('lr-phone');
      if(!ph) m.push(t('phone'));
      else if(!/^\+?[0-9][0-9\s\-()]{5,24}$/.test(ph)){alert(t('phoneInvalid'));return false;}
      break;
    case 4: if(!v('bk-bank'))m.push(t('bankName')); if(!v('bk-holder'))m.push(t('acctName')); if(!v('bk-acct'))m.push(t('acctNumber')); break;
    case 5:
      if(!document.getElementById('agree-terms')?.checked){alert(t('alertAgree'));return false;}
      if(!v('sig-name')||!v('sig-signature')){alert(t('alertSig'));return false;}
      break;
  }
  if(m.length){alert(`${t('alertFill')} ${m.join(', ')}`);return false;}
  return true;
}

/* ── Persistence ──────────────────────────────── */
async function saveProgress() {
  const payload = {
    name:formData.name, segment:formData.segment, trading_name:formData.trading_name,
    registration_number:formData.registration_number, tax_id:formData.tax_id,
    industry:formData.industry, year_established:formData.year_established,
    employee_count:formData.employee_count, website:formData.website,
    description:formData.description, country:formData.country,
    registered_address:formData.registered_address, factory_address:formData.factory_address,
    warehouse_address:formData.warehouse_address, legal_representatives:formData.legal_representatives,
    key_contacts:formData.key_contacts, banking_info:formData.banking_info,
    certifications:formData.certifications, onboarding_step:currentStep,
  };
  if(supplierId){ await supabase.from('oem_sellers').update(payload).eq('id',supplierId); }
  else { supplierId=crypto.randomUUID(); payload.id=supplierId; payload.owner_user_id=userId;
    const{data}=await supabase.from('oem_sellers').insert(payload).select('*'); if(data?.[0])supplierId=data[0].id; }

  // Save team members (if any were added)
  if(formData._team_members?.length && supplierId) {
    for(const tm of formData._team_members) {
      await supabase.from('supplier_team_members').upsert({
        supplier_id: supplierId, email: tm.email, full_name: tm.full_name,
        role: tm.role, invited_by: userId, status: 'pending'
      }, { onConflict: 'supplier_id,email' });
    }
  }
}

async function finalizeOnboarding() {
  const sigName=document.getElementById('sig-name')?.value?.trim()||'';
  collectCurrentData();
  const btn=document.getElementById('ob-next'); btn.textContent=t('finalizing'); btn.disabled=true;
  const payload = {
    name:formData.name,segment:formData.segment,trading_name:formData.trading_name,
    registration_number:formData.registration_number,tax_id:formData.tax_id,
    industry:formData.industry,year_established:formData.year_established,
    employee_count:formData.employee_count,website:formData.website,description:formData.description,
    country:formData.country,registered_address:formData.registered_address,
    factory_address:formData.factory_address,warehouse_address:formData.warehouse_address,
    legal_representatives:formData.legal_representatives,key_contacts:formData.key_contacts,
    banking_info:formData.banking_info,certifications:formData.certifications,
    onboarding_step:STEPS().length,onboarding_completed:true,agreement_signed:true,
    agreement_signed_by:sigName,agreement_signed_at:new Date().toISOString(),
    agreement_version:'v1.0',profile_completion_pct:100,
  };
  if(supplierId){await supabase.from('oem_sellers').update(payload).eq('id',supplierId);}
  else{supplierId=crypto.randomUUID();payload.id=supplierId;payload.owner_user_id=userId;await supabase.from('oem_sellers').insert(payload);}

  document.getElementById('ob-content').innerHTML = `<div style="text-align:center;padding:60px 20px;">
    <div style="font-size:64px;margin-bottom:20px;">🎉</div>
    <h2 style="color:#10B981;margin-bottom:12px;">${t('completeTitle')}</h2>
    <p style="color:#94A3B8;font-size:15px;">${t('completeSub')}</p></div>`;
  document.getElementById('ob-next').style.display='none';
  document.getElementById('ob-prev').style.display='none';
  setTimeout(()=>window.location.reload(),2000);
}

/* ── Helpers ──────────────────────────────────── */
window._addCertRow = function() {
  const list=document.getElementById('cert-list'); if(!list)return;
  const row=document.createElement('div'); row.className='ob-cert-row';
  row.style.cssText='display:grid;grid-template-columns:1fr 1fr 140px 36px;gap:8px;margin-bottom:8px;align-items:center;';
  row.innerHTML=`<select class="cert-type"><option>ISO 9001</option><option>ISO 14001</option><option>ISO 13485</option><option>IATF 16949</option><option>CE Mark</option><option>UL Listed</option><option>RoHS</option><option>REACH</option><option>Other</option></select>
    <input type="text" class="cert-number" placeholder="${t('certNo')}"><input type="date" class="cert-expiry" title="${t('certExpiry')}">
    <button type="button" onclick="this.parentElement.remove()" class="ob-btn-remove">✕</button>`;
  list.appendChild(row);
};

window._addTeamRow = function() {
  const list=document.getElementById('team-list'); if(!list)return;
  const row=document.createElement('div'); row.className='ob-team-row';
  row.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr 36px;gap:8px;margin-bottom:8px;align-items:center;';
  row.innerHTML=`<input type="text" class="team-name" placeholder="${t('teamName')}">
    <input type="email" class="team-email" placeholder="${t('teamEmail')}">
    <select class="team-role"><option value="admin">${t('roleAdmin')}</option><option value="sales">${t('roleSales')}</option><option value="operations">${t('roleOps')}</option><option value="viewer" selected>${t('roleViewer')}</option></select>
    <button type="button" onclick="this.parentElement.remove()" class="ob-btn-remove">✕</button>`;
  list.appendChild(row);
};

function esc(s){return(s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
