/**
 * AtlasDT Supplier Platform Agreement — Bilingual EN/ZH
 * Paniani Products Pty Ltd (ABN: TBC) trading as AtlasDT
 */
import { getLang } from './onboarding-i18n.js';

export function getAgreementHTML() {
  const l = getLang();
  if (l === 'zh') return ZH;
  if (l === 'en') return EN;
  return DUAL;
}

const EN = `
<p><strong>ATLASDT B2B MARKETPLACE — SUPPLIER AGREEMENT</strong></p>
<p><em>Version 1.0 — Effective Date: Upon execution by Supplier</em></p>
<p>This Supplier Agreement ("Agreement") is entered into by and between:</p>
<p><strong>Paniani Products Pty Ltd</strong> (ABN pending), an Australian company trading as <strong>AtlasDT</strong>, with its principal office in Sydney, NSW, Australia ("Platform Operator" or "AtlasDT"); and</p>
<p>The entity completing this onboarding process ("Supplier").</p>
<p>Together referred to as the "Parties".</p>

<hr>

<p><strong>1. DEFINITIONS</strong></p>
<p>1.1 "Platform" means the AtlasDT B2B online marketplace at atlasdt.com and all associated services.<br>
1.2 "Products" means goods, components, or materials listed by the Supplier on the Platform.<br>
1.3 "Buyer" means any registered purchaser transacting on the Platform.<br>
1.4 "Commission" means the service fee charged by AtlasDT on completed transactions.<br>
1.5 "Payout" means the transfer of funds from AtlasDT to the Supplier's designated bank account.</p>

<p><strong>2. SCOPE OF SERVICES</strong></p>
<p>2.1 AtlasDT provides the Platform as a marketplace facilitating B2B transactions between Suppliers and Buyers.<br>
2.2 AtlasDT acts solely as an intermediary and does not take title to or possession of Products.<br>
2.3 The Supplier is responsible for the manufacture, quality, packaging, labelling, and shipment of all Products.</p>

<p><strong>3. SUPPLIER OBLIGATIONS</strong></p>
<p>3.1 <strong>Product Accuracy.</strong> Supplier warrants that all product listings, descriptions, specifications, images, and pricing are accurate, complete, and not misleading.<br>
3.2 <strong>Legal Compliance.</strong> Supplier shall comply with all applicable laws, regulations, and standards in its country of operation and in the destination markets, including but not limited to export controls, product safety standards, labelling requirements, environmental regulations, and anti-corruption laws.<br>
3.3 <strong>Intellectual Property.</strong> Supplier warrants that Products do not infringe upon any third-party intellectual property rights including patents, trademarks, copyrights, or trade secrets.<br>
3.4 <strong>Quality Standards.</strong> Supplier shall maintain quality standards consistent with the certifications and representations declared during onboarding. Supplier shall implement and maintain appropriate quality control processes.<br>
3.5 <strong>Insurance.</strong> Supplier shall maintain adequate product liability insurance and other commercially appropriate insurance coverage.<br>
3.6 <strong>Records.</strong> Supplier shall maintain accurate business records and make them available to AtlasDT upon reasonable request for audit purposes.</p>

<p><strong>4. PRODUCT LISTINGS & PRICING</strong></p>
<p>4.1 Supplier shall list Products with accurate descriptions, specifications, MOQ (Minimum Order Quantity), lead times, and pricing.<br>
4.2 Pricing must be kept current. Supplier shall not change pricing on confirmed orders without Buyer consent.<br>
4.3 AtlasDT reserves the right to remove or suspend any listing that violates this Agreement or applicable law.<br>
4.4 Supplier grants AtlasDT a non-exclusive license to use product images, descriptions, and trademarks solely for marketing and promoting Products on the Platform.</p>

<p><strong>5. ORDERS & FULFILLMENT</strong></p>
<p>5.1 Upon receiving an order confirmation, Supplier shall acknowledge the order within 2 business days.<br>
5.2 Supplier commits to fulfilling orders within the stated lead times. Delays must be communicated proactively to the Buyer and AtlasDT.<br>
5.3 Supplier shall provide tracking information for all shipments.<br>
5.4 Repeated failures to fulfill orders may result in listing suspension, financial penalties, or account termination.</p>

<p><strong>6. COMMISSION & PAYMENTS</strong></p>
<p>6.1 AtlasDT will charge a Commission of up to 8% on the net transaction value of each completed order.<br>
6.2 Payouts will be processed within 14 business days of confirmed delivery and Buyer acceptance.<br>
6.3 AtlasDT may withhold Payouts in cases of disputes, suspected fraud, or violation of this Agreement.<br>
6.4 The Supplier is responsible for all taxes, duties, and fees applicable to payments received.</p>

<p><strong>7. RETURNS, REFUNDS & DISPUTES</strong></p>
<p>7.1 Supplier shall honor the Platform's returns and refund policy as published and updated from time to time.<br>
7.2 In the event of a product quality dispute, AtlasDT may mediate between the parties. If mediation fails, the dispute shall be resolved under Section 14.<br>
7.3 Supplier shall respond to all Buyer complaints and dispute claims within 5 business days.</p>

<p><strong>8. CONFIDENTIALITY</strong></p>
<p>8.1 Each Party shall keep confidential all non-public information received from the other Party during the course of business.<br>
8.2 Confidential information includes but is not limited to pricing strategies, customer data, product specifications, business plans, and technical information.<br>
8.3 This obligation survives termination of this Agreement for a period of 3 years.</p>

<p><strong>9. DATA PROTECTION & PRIVACY</strong></p>
<p>9.1 Both Parties shall comply with applicable data protection laws, including the Australian Privacy Act 1988 and, where applicable, the GDPR and China's Personal Information Protection Law (PIPL).<br>
9.2 Supplier consents to AtlasDT processing Supplier data as necessary for Platform operations.<br>
9.3 Supplier shall not misuse any Buyer personal data obtained through the Platform.</p>

<p><strong>10. REPRESENTATIONS & WARRANTIES</strong></p>
<p>10.1 Supplier represents and warrants that: (a) it is duly organized, validly existing, and in good standing; (b) it has all necessary licenses, permits, and authorizations; (c) the person executing this Agreement has authority to bind the Supplier; (d) Products comply with all applicable safety and regulatory standards.</p>

<p><strong>11. INDEMNIFICATION</strong></p>
<p>11.1 Supplier shall indemnify, defend, and hold harmless AtlasDT, its officers, directors, employees, and agents from and against any claims, losses, damages, liabilities, costs, and expenses (including reasonable legal fees) arising from or related to: (a) defective Products; (b) misrepresentation or false information; (c) infringement of third-party rights; (d) violation of applicable laws; (e) Supplier's breach of this Agreement.</p>

<p><strong>12. LIMITATION OF LIABILITY</strong></p>
<p>12.1 To the maximum extent permitted by law, AtlasDT's total liability to the Supplier under this Agreement shall not exceed the total Commission fees paid by the Supplier to AtlasDT in the 12 months preceding the claim.<br>
12.2 AtlasDT shall not be liable for indirect, incidental, consequential, special, or punitive damages.</p>

<p><strong>13. TERM & TERMINATION</strong></p>
<p>13.1 This Agreement commences upon Supplier's execution and continues until terminated.<br>
13.2 Either Party may terminate with 30 days' written notice.<br>
13.3 AtlasDT may terminate immediately if Supplier: (a) breaches any material term; (b) engages in fraudulent activity; (c) receives repeated quality complaints; (d) becomes insolvent.<br>
13.4 Upon termination: (a) all pending orders shall be fulfilled; (b) outstanding payouts shall be processed within 30 days; (c) Supplier's listings will be removed.</p>

<p><strong>14. GOVERNING LAW & DISPUTE RESOLUTION</strong></p>
<p>14.1 This Agreement is governed by and construed in accordance with the laws of New South Wales, Australia.<br>
14.2 Any dispute arising out of or in connection with this Agreement shall first be submitted to good-faith mediation.<br>
14.3 If mediation fails within 30 days, the dispute shall be referred to and finally resolved by arbitration administered by the Australian Centre for International Commercial Arbitration (ACICA) in Sydney, NSW.<br>
14.4 The language of arbitration shall be English.</p>

<p><strong>15. GENERAL PROVISIONS</strong></p>
<p>15.1 <strong>Entire Agreement.</strong> This Agreement constitutes the entire agreement between the Parties and supersedes all prior agreements or understandings.<br>
15.2 <strong>Amendments.</strong> AtlasDT may update this Agreement with 30 days' notice. Continued use of the Platform constitutes acceptance.<br>
15.3 <strong>Severability.</strong> If any provision is found invalid, the remaining provisions continue in full force.<br>
15.4 <strong>Assignment.</strong> Supplier may not assign this Agreement without AtlasDT's prior written consent.<br>
15.5 <strong>Force Majeure.</strong> Neither Party shall be liable for failure to perform due to circumstances beyond reasonable control, including natural disasters, government actions, pandemics, or war.<br>
15.6 <strong>Waiver.</strong> Failure to enforce any provision shall not constitute a waiver of that provision.<br>
15.7 <strong>Language.</strong> This Agreement is executed in English and Chinese. In case of conflict, the English version shall prevail.</p>
`;

const ZH = `
<p><strong>ATLASDT B2B 电商平台 — 供应商协议</strong></p>
<p><em>版本 1.0 — 生效日期：供应商签署之日起</em></p>
<p>本供应商协议（"本协议"）由以下双方签订：</p>
<p><strong>Paniani Products Pty Ltd</strong>（ABN待定），一家澳大利亚公司，以 <strong>AtlasDT</strong> 为商号经营，主要办公地点位于澳大利亚新南威尔士州悉尼（"平台运营商"或"AtlasDT"）；及</p>
<p>完成本入驻流程的企业实体（"供应商"）。</p>
<p>以下合称"双方"。</p>

<hr>

<p><strong>1. 定义</strong></p>
<p>1.1 "平台"指AtlasDT B2B在线交易平台（atlasdt.com）及所有相关服务。<br>
1.2 "产品"指供应商在平台上发布的商品、组件或材料。<br>
1.3 "买方"指在平台上进行交易的注册采购商。<br>
1.4 "佣金"指AtlasDT对已完成交易收取的服务费。<br>
1.5 "付款"指AtlasDT向供应商指定银行账户转入的资金。</p>

<p><strong>2. 服务范围</strong></p>
<p>2.1 AtlasDT提供平台作为促进供应商与买方之间B2B交易的交易市场。<br>
2.2 AtlasDT仅作为中介方，不对产品拥有所有权或占有权。<br>
2.3 供应商负责所有产品的制造、质量控制、包装、标签和发运。</p>

<p><strong>3. 供应商义务</strong></p>
<p>3.1 <strong>产品准确性。</strong>供应商保证所有产品信息、描述、规格、图片和价格准确、完整且无误导性。<br>
3.2 <strong>法律合规。</strong>供应商应遵守其经营所在国及目的地市场的所有适用法律、法规和标准，包括但不限于出口管制、产品安全标准、标签要求、环境法规和反腐败法律。<br>
3.3 <strong>知识产权。</strong>供应商保证产品不侵犯任何第三方知识产权，包括专利、商标、版权或商业秘密。<br>
3.4 <strong>质量标准。</strong>供应商应维持与入驻时声明的认证和陈述相一致的质量标准，并实施和维护适当的质量控制流程。<br>
3.5 <strong>保险。</strong>供应商应维持充分的产品责任保险和其他适当的商业保险。<br>
3.6 <strong>记录。</strong>供应商应保存准确的商业记录，并在合理要求下向AtlasDT提供以供审计。</p>

<p><strong>4. 产品发布与定价</strong></p>
<p>4.1 供应商应发布包含准确描述、规格、最低起订量（MOQ）、交货周期和定价的产品信息。<br>
4.2 定价必须保持实时更新。供应商不得在未经买方同意的情况下更改已确认订单的价格。<br>
4.3 AtlasDT有权删除或暂停任何违反本协议或适用法律的产品。<br>
4.4 供应商授予AtlasDT非独占许可，仅用于在平台上推广产品时使用产品图片、描述和商标。</p>

<p><strong>5. 订单与履约</strong></p>
<p>5.1 收到订单确认后，供应商应在2个工作日内确认订单。<br>
5.2 供应商承诺在约定交货期内完成订单。延误须提前通知买方和AtlasDT。<br>
5.3 供应商应提供所有发货的物流追踪信息。<br>
5.4 多次未能履行订单可能导致产品下架、罚款或账号终止。</p>

<p><strong>6. 佣金与付款</strong></p>
<p>6.1 AtlasDT将对每笔已完成订单的净交易额收取最高8%的佣金。<br>
6.2 付款将在确认交付且买方接受后的14个工作日内处理。<br>
6.3 如发生争议、涉嫌欺诈或违反本协议，AtlasDT可暂扣付款。<br>
6.4 供应商应自行承担因收到付款而产生的所有税款、关税和费用。</p>

<p><strong>7. 退货、退款与争议</strong></p>
<p>7.1 供应商应遵守平台不时公布和更新的退货退款政策。<br>
7.2 如发生产品质量争议，AtlasDT可在双方之间进行调解。如调解不成，争议应按第14条解决。<br>
7.3 供应商应在5个工作日内回复所有买方投诉和争议索赔。</p>

<p><strong>8. 保密</strong></p>
<p>8.1 双方应对在业务过程中从对方收到的所有非公开信息予以保密。<br>
8.2 保密信息包括但不限于定价策略、客户数据、产品规格、商业计划和技术信息。<br>
8.3 本保密义务在本协议终止后继续有效3年。</p>

<p><strong>9. 数据保护与隐私</strong></p>
<p>9.1 双方应遵守适用的数据保护法律，包括澳大利亚《隐私法1988》及（如适用）欧盟GDPR和中国《个人信息保护法》（PIPL）。<br>
9.2 供应商同意AtlasDT在平台运营所需范围内处理供应商数据。<br>
9.3 供应商不得滥用通过平台获取的任何买方个人数据。</p>

<p><strong>10. 陈述与保证</strong></p>
<p>10.1 供应商陈述并保证：(a) 其已依法成立、合法存续且信誉良好；(b) 持有所有必要的许可证、执照和授权；(c) 签署本协议的人员有权约束供应商；(d) 产品符合所有适用的安全和监管标准。</p>

<p><strong>11. 赔偿</strong></p>
<p>11.1 供应商应赔偿、辩护并使AtlasDT、其高管、董事、员工和代理人免受因以下原因引起或相关的任何索赔、损失、损害、责任、费用和开支（包括合理律师费）：(a) 有缺陷的产品；(b) 虚假陈述或虚假信息；(c) 侵犯第三方权利；(d) 违反适用法律；(e) 供应商违反本协议。</p>

<p><strong>12. 责任限制</strong></p>
<p>12.1 在法律允许的最大范围内，AtlasDT在本协议项下对供应商的全部责任不超过索赔前12个月供应商向AtlasDT支付的佣金总额。<br>
12.2 AtlasDT不对间接、附带、后果性、特殊或惩罚性损害赔偿承担责任。</p>

<p><strong>13. 期限与终止</strong></p>
<p>13.1 本协议自供应商签署之日起生效，持续有效直至终止。<br>
13.2 任一方可提前30天书面通知终止本协议。<br>
13.3 如供应商有以下情形，AtlasDT可立即终止本协议：(a) 违反任何实质性条款；(b) 从事欺诈活动；(c) 反复收到质量投诉；(d) 资不抵债。<br>
13.4 终止后：(a) 所有待处理订单应继续履行；(b) 未结付款应在30日内处理；(c) 供应商产品将被下架。</p>

<p><strong>14. 适用法律与争议解决</strong></p>
<p>14.1 本协议受澳大利亚新南威尔士州法律管辖并据其解释。<br>
14.2 因本协议引起的或与之相关的任何争议，应首先提交善意调解。<br>
14.3 如调解在30日内未能解决，争议应提交至澳大利亚国际商事仲裁中心（ACICA）在悉尼进行仲裁并最终解决。<br>
14.4 仲裁语言为英语。</p>

<p><strong>15. 一般条款</strong></p>
<p>15.1 <strong>完整协议。</strong>本协议构成双方之间的完整协议，取代所有先前的协议或谅解。<br>
15.2 <strong>修订。</strong>AtlasDT可提前30天通知修订本协议。继续使用平台即表示接受修订。<br>
15.3 <strong>可分割性。</strong>如任何条款被认定无效，其余条款继续完全有效。<br>
15.4 <strong>转让。</strong>未经AtlasDT事先书面同意，供应商不得转让本协议。<br>
15.5 <strong>不可抗力。</strong>任一方均不对因超出合理控制范围的情况（包括自然灾害、政府行为、疫情或战争）而导致的未能履约承担责任。<br>
15.6 <strong>弃权。</strong>未执行任何条款不构成对该条款的放弃。<br>
15.7 <strong>语言。</strong>本协议以英文和中文签署。如有冲突，以英文版本为准。</p>
`;

// Dual-language (side by side sections) — uses both for display
const DUAL = EN;
