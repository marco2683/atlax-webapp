/**
 * Bilingual dictionary for Supplier Onboarding Wizard (EN / ZH)
 */
let _lang = 'en';
export function setLang(l) { _lang = l; }
export function getLang() { return _lang; }
export function t(key) { return DICT[key]?.[_lang] || DICT[key]?.en || key; }

export const DICT = {
  // ── Wizard chrome ───────────────────────────────
  onboardingSub:    { en: 'Supplier Onboarding', zh: '供应商入驻' },
  saveExit:         { en: 'Save & Exit', zh: '保存并退出' },
  back:             { en: '← Back', zh: '← 返回' },
  continue:         { en: 'Continue →', zh: '继续 →' },
  signComplete:     { en: 'Sign & Complete ✓', zh: '签署并完成 ✓' },
  langToggle:       { en: '中文', zh: 'English' },

  // ── Step titles ─────────────────────────────────
  step1title:       { en: 'Company Information', zh: '公司信息' },
  step2title:       { en: 'Licenses & Certifications', zh: '营业执照与资质认证' },
  step3title:       { en: 'Business Addresses', zh: '企业地址' },
  step4title:       { en: 'Key Contacts & Legal Reps', zh: '关键联系人与法定代表人' },
  step5title:       { en: 'Banking & Payouts', zh: '银行账户与付款信息' },
  step6title:       { en: 'Platform Agreement', zh: '平台协议' },

  // ── Step 1: Company ─────────────────────────────
  legalName:        { en: 'Legal Business Name', zh: '企业法定名称' },
  tradingName:      { en: 'Trading / DBA Name', zh: '商号 / 品牌名称' },
  regNo:            { en: 'Business Registration No.', zh: '统一社会信用代码' },
  taxId:            { en: 'Tax ID / VAT Number', zh: '税号 / 增值税号' },
  country:          { en: 'Country of Incorporation', zh: '注册国家/地区' },
  industry:         { en: 'Primary Industry', zh: '主营行业' },
  bizFocus:         { en: 'Business Focus', zh: '业务类型' },
  yearEst:          { en: 'Year Established', zh: '成立年份' },
  employees:        { en: 'Number of Employees', zh: '员工人数' },
  website:          { en: 'Company Website', zh: '公司网站' },
  companyDesc:      { en: 'Brief Company Description', zh: '公司简介' },
  companyDescPh:    { en: 'Describe your core capabilities and specialties...', zh: '描述您的核心能力和专业领域...' },
  optional:         { en: 'Optional', zh: '选填' },

  // Industry options
  indElec:          { en: 'Electronics Manufacturing', zh: '电子制造' },
  indCNC:           { en: 'Mechanical / CNC', zh: '机械加工 / CNC' },
  indPlastic:       { en: 'Plastics & Injection Molding', zh: '塑料与注塑成型' },
  indPCB:           { en: 'PCB & PCBA', zh: 'PCB与PCBA' },
  indMetal:         { en: 'Metal Fabrication', zh: '金属加工' },
  indPack:          { en: 'Packaging', zh: '包装' },
  indChem:          { en: 'Chemical / Materials', zh: '化工/材料' },
  indTextile:       { en: 'Textiles', zh: '纺织品' },
  indOther:         { en: 'Other', zh: '其他' },

  // Segment options
  segOEM:           { en: 'OEM', zh: 'OEM（原始设备制造商）' },
  segDist:          { en: 'Distributor', zh: '分销商' },
  segCM:            { en: 'Contract Manufacturer', zh: '代工制造商' },

  // ── Step 2: Licenses ────────────────────────────
  licHint:          { en: 'Upload your business license and any relevant certifications. Accepted formats: PDF, JPG, PNG (max 10MB each).', zh: '请上传您的营业执照及相关资质证书。支持格式：PDF、JPG、PNG（每个文件最大10MB）。' },
  bizLicense:       { en: 'Business License', zh: '营业执照' },
  uploadBizLic:     { en: 'Click to upload business license', zh: '点击上传营业执照' },
  exportLicense:    { en: 'Export License (if applicable)', zh: '出口许可证（如适用）' },
  uploadExport:     { en: 'Click to upload export license', zh: '点击上传出口许可证' },
  certifications:   { en: 'Certifications', zh: '资质认证' },
  certHint:         { en: 'Add ISO, CE, UL, or other relevant certifications your company holds.', zh: '添加贵公司持有的ISO、CE、UL或其他相关认证。' },
  addCert:          { en: '+ Add Certification', zh: '+ 添加认证' },
  certNo:           { en: 'Certificate No.', zh: '证书编号' },
  certType:         { en: 'Type', zh: '认证类型' },
  certExpiry:       { en: 'Expiry Date', zh: '有效期至' },
  fileHint:         { en: 'PDF, JPG, PNG — Max 10MB', zh: 'PDF、JPG、PNG — 最大10MB' },
  fileUploaded:     { en: '✓ File selected', zh: '✓ 文件已选择' },
  sameAsLegal:      { en: 'Factory address same as registered/legal address', zh: '工厂地址与注册/法定地址相同' },
  phoneInvalid:     { en: 'Please enter a valid phone number (e.g. +86 13800138000)', zh: '请输入有效的电话号码（如 +86 13800138000）' },
  curOther:         { en: 'Other (specify below)', zh: '其他（请在下方注明）' },
  curOtherLabel:    { en: 'Other Currency Code', zh: '其他币种代码' },
  curOtherPh:       { en: 'e.g. GBP, JPY, THB...', zh: '如：GBP、JPY、THB...' },

  // ── Step 3: Addresses ───────────────────────────
  regAddr:          { en: 'Registered / Legal Address', zh: '注册/法定地址' },
  facAddr:          { en: 'Factory / Production Address', zh: '工厂/生产地址' },
  whAddr:           { en: 'Warehouse / Shipping Address', zh: '仓库/发货地址' },
  sameAsFactory:    { en: 'Warehouse address same as factory', zh: '仓库地址与工厂地址相同' },
  addrLine1:        { en: 'Address Line 1', zh: '地址行1' },
  addrLine2:        { en: 'Address Line 2', zh: '地址行2' },
  addrLine1Ph:      { en: 'Street address', zh: '街道地址' },
  addrLine2Ph:      { en: 'Suite, unit, building (optional)', zh: '门牌号、单元、楼栋（选填）' },
  city:             { en: 'City', zh: '城市' },
  stateProvince:    { en: 'State / Province', zh: '省/州' },
  postalCode:       { en: 'Postal Code', zh: '邮政编码' },
  countryRegion:    { en: 'Country', zh: '国家/地区' },

  // ── Step 4: Contacts ────────────────────────────
  legalRep:         { en: 'Primary Legal Representative', zh: '主要法定代表人' },
  fullName:         { en: 'Full Name', zh: '姓名' },
  titlePosition:    { en: 'Title / Position', zh: '职务/头衔' },
  titlePh:          { en: '— Select title —', zh: '— 请选择职位 —' },
  email:            { en: 'Email', zh: '电子邮箱' },
  phone:            { en: 'Phone', zh: '电话' },
  salesContact:     { en: 'Commercial / Sales Contact', zh: '商务/销售联系人' },

  // ── Team Members ─────────────────────────────────
  teamTitle:        { en: 'Team Members & Access', zh: '团队成员与权限' },
  teamHint:         { en: 'Invite team members to manage your supplier account. They will receive an email invitation to join.', zh: '邀请团队成员管理您的供应商账户。他们将收到电子邮件邀请加入。' },
  teamName:         { en: 'Full Name', zh: '姓名' },
  teamEmail:        { en: 'Email Address', zh: '电子邮箱' },
  teamRole:         { en: 'Role', zh: '角色' },
  teamAdd:          { en: '+ Invite Team Member', zh: '+ 邀请团队成员' },
  teamRemove:       { en: 'Remove', zh: '移除' },
  roleAdmin:        { en: 'Admin — Full access', zh: '管理员 — 完全访问权限' },
  roleSales:        { en: 'Sales — Products & orders', zh: '销售 — 产品与订单' },
  roleOps:          { en: 'Operations — Logistics & inventory', zh: '运营 — 物流与库存' },
  roleViewer:       { en: 'Viewer — Read only', zh: '查看者 — 只读权限' },

  // ── Step 5: Banking ─────────────────────────────
  bankHint:         { en: 'Provide your banking details for marketplace payouts. This information is encrypted and stored securely.', zh: '请提供您的银行账户信息用于平台付款结算。所有信息均加密安全存储。' },
  bankAcctLabel:    { en: 'Bank Account', zh: '银行账户' },
  addBankAcct:      { en: 'Add Another Bank Account', zh: '添加另一个银行账户' },
  removeAcct:       { en: 'Remove this account', zh: '移除此账户' },
  bankCountry:      { en: 'Bank Account Country / Region', zh: '银行账户所在国家/地区' },
  bankName:         { en: 'Bank Name', zh: '开户银行名称' },
  bankNamePh:       { en: 'e.g. Industrial and Commercial Bank of China', zh: '如：中国工商银行' },
  branchName:       { en: 'Branch Name', zh: '开户支行名称' },
  branchNamePh:     { en: 'e.g. Shenzhen Futian Sub-branch', zh: '如：深圳市福田支行' },
  acctName:         { en: 'Account Name (Beneficiary)', zh: '账户名称（收款人）' },
  acctNamePh:       { en: 'Must match your registered company name', zh: '须与企业注册名称一致' },
  acctNumber:       { en: 'Account Number', zh: '银行账号' },
  swiftCode:        { en: 'SWIFT / BIC Code', zh: 'SWIFT / BIC代码' },
  swiftPh:          { en: 'e.g. ICBKCNBJ', zh: '如：ICBKCNBJ' },
  cnapsCode:        { en: 'CNAPS Code (联行号)', zh: 'CNAPS联行号' },
  cnapsPh:          { en: '12-digit code for mainland China banks', zh: '12位数字，用于中国大陆银行' },
  bankCode:         { en: 'Bank Code', zh: '银行代码' },
  bankCodePh:       { en: '3-digit bank code (e.g. DBS: 7171)', zh: '3-4位银行代码' },
  branchCode:       { en: 'Branch Code', zh: '分行代码' },
  branchCodePh:     { en: '3-digit branch code', zh: '3位分行代码' },
  benefAddr:        { en: 'Beneficiary Address', zh: '收款人地址' },
  benefAddrPh:      { en: 'Registered address of the account holder', zh: '账户持有人的注册地址' },
  bankAddr:         { en: 'Bank Address', zh: '开户行地址' },
  bankAddrPh:       { en: 'Full address of the bank branch', zh: '开户支行完整地址' },
  currency:         { en: 'Preferred Settlement Currency', zh: '首选结算币种' },
  iban:             { en: 'IBAN (if applicable)', zh: 'IBAN（如适用）' },
  ibanPh:           { en: 'International Bank Account Number', zh: '国际银行账号' },
  routingNo:        { en: 'Routing / Sort Code', zh: '汇款路由号' },
  routingPh:        { en: 'For USD wire transfers', zh: '用于美元电汇' },

  // Bank country options
  bankCN:           { en: 'Mainland China (中国大陆)', zh: '中国大陆' },
  bankHK:           { en: 'Hong Kong (香港)', zh: '香港' },
  bankSG:           { en: 'Singapore (新加坡)', zh: '新加坡' },
  bankMY:           { en: 'Malaysia (马来西亚)', zh: '马来西亚' },
  bankOther:        { en: 'Other / International', zh: '其他/国际' },

  // Currency options
  curCNY:           { en: 'CNY — Chinese Yuan (人民币)', zh: '人民币 (CNY)' },
  curUSD:           { en: 'USD — US Dollar', zh: '美元 (USD)' },
  curHKD:           { en: 'HKD — Hong Kong Dollar', zh: '港币 (HKD)' },
  curSGD:           { en: 'SGD — Singapore Dollar', zh: '新加坡元 (SGD)' },
  curMYR:           { en: 'MYR — Malaysian Ringgit', zh: '马来西亚令吉 (MYR)' },
  curAUD:           { en: 'AUD — Australian Dollar', zh: '澳元 (AUD)' },
  curEUR:           { en: 'EUR — Euro', zh: '欧元 (EUR)' },

  // ── Step 6: Agreement ───────────────────────────
  agreementTitle:   { en: 'AtlasDT Supplier Platform Agreement — v1.0', zh: 'AtlasDT 供应商平台协议 — v1.0' },
  agreeCheckbox:    { en: 'I have read and agree to the AtlasDT Supplier Platform Agreement', zh: '我已阅读并同意AtlasDT供应商平台协议' },
  sigName:          { en: 'Signatory Full Name', zh: '签署人姓名' },
  sigNamePh:        { en: 'Your legal name', zh: '您的法定姓名' },
  sigDate:          { en: 'Date', zh: '日期' },
  sigDigital:       { en: 'Digital Signature (type your full name)', zh: '电子签名（请输入您的全名）' },
  sigDigitalPh:     { en: 'Type your full legal name as signature', zh: '请输入您的法定全名作为签名' },
  alertAgree:       { en: 'Please accept the agreement to continue.', zh: '请接受协议后继续。' },
  alertSig:         { en: 'Please provide your name and digital signature.', zh: '请提供您的姓名和电子签名。' },
  alertFill:        { en: 'Please fill in:', zh: '请填写以下字段：' },

  // ── Completion ──────────────────────────────────
  completeTitle:    { en: 'Onboarding Complete!', zh: '入驻完成！' },
  completeSub:      { en: 'Your supplier profile has been created. Redirecting to your dashboard...', zh: '您的供应商档案已创建。正在跳转到您的仪表板...' },
  finalizing:       { en: 'Finalizing...', zh: '正在提交...' },
};
