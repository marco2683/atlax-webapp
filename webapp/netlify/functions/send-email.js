const { Resend } = require('resend');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { email, userId, type, cover_letter, name } = body;

    const validTypes = ['designer_application', 'designer_approved', 'designer_rejected', 'project_rfq', 'rfq_removed', 'rfq_payment', 'rfq_confirmed', 'rfq_rejected', 'rfq_request_info', 'rfq_document', 'marketplace_order', 'marketplace_supplier_notify', 'marketplace_cart_reminder'];
    if (!validTypes.includes(type)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid application type' }) };
    }

    // You must set RESEND_API_KEY in your Netlify Environment Variables
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.warn("No RESEND_API_KEY found, skipping email dispatch.");
      // We will return 200 anyway so the frontend doesn't break if emails aren't setup yet.
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Email skipped because key is missing, but success otherwise." })
      };
    }

    let subject = '';
    let htmlContent = '';
    let toEmailAddr = ['info@atlasdt.com'];
    const logoUrl = 'https://atlasdt.com/logos/atlasdt-logo-full.png';

    if (type === 'designer_application') {
        toEmailAddr = ['info@atlasdt.com'];
        subject = `New Designer Application: ${email}`;
        htmlContent = `
          <h2>New Designer Hub Application</h2>
          <p><strong>Applicant Email:</strong> ${email}</p>
          <p><strong>User ID:</strong> ${userId}</p>
          <h3>Cover Letter:</h3>
          <p style="white-space: pre-wrap; background: #eee; padding: 10px;">${cover_letter}</p>
          <hr />
          <p>Please log in to the Atlas DT Admin Panel to review their application.</p>
        `;
    } else if (type === 'designer_approved') {
        toEmailAddr = [email];
        subject = `Welcome to the Atlas DT Designer Hub!`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${logoUrl}" alt="Atlas DT" style="height: 40px;" />
            </div>
            <h2 style="color: #0ea5e9; font-size: 24px; margin-bottom: 20px;">Your application has been approved!</h2>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hi ${name || 'Designer'},<br><br>
              We've reviewed your portfolio and application, and we are thrilled to welcome you into the Atlas DT Designer Hub. You now have full access to our ecosystem.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              <strong>What's next?</strong><br>
              Log in to the platform to finish setting up your profile, browse current engineering projects, and start offering your services to clients worldwide.
            </p>
            <div style="text-align: center; margin-top: 40px; padding: 20px; border-top: 1px solid #eee;">
              <span style="font-size: 12px; color: #999;">Copyright &copy; Atlas DT. All rights reserved.</span>
            </div>
          </div>
        `;
    } else if (type === 'designer_rejected') {
        toEmailAddr = [email];
        subject = `Update regarding your Atlas DT Application`;
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${logoUrl}" alt="Atlas DT" style="height: 40px;" />
            </div>
            <h2 style="font-size: 20px; margin-bottom: 20px;">Application Status Update</h2>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hi ${name || 'Designer'},<br><br>
              Thank you for your interest in joining the Atlas DT Designer Hub. After carefully reviewing your background and portfolio, we regret to inform you that we cannot approve your application at this time.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Our network maintains strict technical and operational criteria, and unfortunately, your current application does not fulfill our minimum requirements for commercial onboarding.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              If you have any questions, or if you'd like to update us with an expanded portfolio in the future, please feel free to reply directly to this email or contact us at <strong>info@atlasdt.com</strong>.
            </p>
            <div style="text-align: center; margin-top: 40px; padding: 20px; border-top: 1px solid #eee;">
              <span style="font-size: 12px; color: #999;">Copyright &copy; Atlas DT. All rights reserved.</span>
            </div>
          </div>
        `;
    } else if (type === 'project_rfq') {
        const { projectName, service, quantity, timeline, fileCount, fileNames, company } = body;
        toEmailAddr = ['info@atlasdt.com', email];
        subject = `Quote Confirmation | ${projectName || 'Unnamed Project'}`;

        const serviceLabels = {
          'mfg-only': 'Manufacturing Only',
          'design-mfg': 'Design + Manufacturing',
          'prototype': 'Prototyping',
          'full-turnkey': 'Full Turnkey (Design → Assembly)',
          'consult': 'Consultation / DFM Review'
        };
        const timelineLabels = {
          'flexible': 'Flexible',
          '4-weeks': '4 Weeks',
          '8-weeks': '8 Weeks',
          '12-weeks': '12 Weeks',
          'custom': 'Custom'
        };

        const fileListHtml = (fileNames || []).map(f =>
          `<li style="padding: 4px 0; color: #4b5563;">${f}</li>`
        ).join('') || '<li style="color:#999;">No files listed</li>';

        htmlContent = `
          <div style="font-family: 'Inter', sans-serif; max-width: 640px; margin: 0 auto; padding: 32px 24px; color: #333; background-color: #f8fafc; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${logoUrl}" alt="Atlas DT" style="height: 40px;" />
            </div>
            
            <div style="background: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
              <h2 style="color: #0ea5e9; font-size: 24px; margin-top: 0; margin-bottom: 16px;">We've received your request!</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
                Hi ${name ? name.split(' ')[0] : 'there'},<br><br>
                This is the team from AtlasDT. We wanted to let you know that we've safely received your project quote request.
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                One of our engineers is reviewing your files right now. We will either get back to you shortly to request a bit more information, or we'll provide your full quotation within <strong>24 to 48 hours</strong>.
              </p>
              <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-top: 0; margin-bottom: 12px;">Project Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; font-weight: 600; color: #334155; width: 140px; font-size: 14px;">Project Name</td>
                    <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${projectName || '—'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; font-weight: 600; color: #334155; font-size: 14px;">Service</td>
                    <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${serviceLabels[service] || service || '—'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; font-weight: 600; color: #334155; font-size: 14px;">Est. Quantity</td>
                    <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${quantity || '—'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; font-weight: 600; color: #334155; font-size: 14px;">Timeline</td>
                    <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${timelineLabels[timeline] || timeline || '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #334155; font-size: 14px;">Files Uploaded</td>
                    <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${fileCount || 0} file(s)</td>
                  </tr>
                </table>
              </div>
              <h3 style="font-size: 14px; color: #334155; margin-bottom: 8px;">Uploaded Files</h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; margin-bottom: 24px;">${fileListHtml}</ul>
              
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 0;">
                If you need to make any changes or have questions in the meantime, just reply directly to this email. We're here to help!
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">
                You can manage your requests in your <a href="https://atlasdt.com/workspace.html" style="color: #0ea5e9; text-decoration: none;">Workspace</a>.
              </p>
              <span style="font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} AtlasDT. All rights reserved.</span>
            </div>
          </div>
        `;
    } else if (type === 'rfq_removed') {
        const { email, projectName, reason } = body;
        toEmailAddr = [email];
        subject = `Update on your Project RFQ: ${projectName || 'Unnamed Project'}`;
        htmlContent = `
          <div style="font-family: 'Inter', sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${logoUrl}" alt="Atlas DT" style="height: 40px;" />
            </div>
            <h2 style="color: #ef4444; font-size: 22px; margin-bottom: 20px;">Update Regarding Your Quote Request</h2>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Thank you for considering Atlas DT for your project <strong>${projectName || 'Unnamed Project'}</strong>.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              After reviewing your request, we have removed it from our active pipeline for the following reason:
            </p>
            <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin-bottom: 24px; color: #991b1b; font-style: italic;">
              "${reason || 'No additional information provided.'}"
            </div>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              If you have any questions or wish to provide additional information, please feel free to reply directly to this email or contact us at <strong>info@atlasdt.com</strong>.
            </p>
            <div style="text-align: center; margin-top: 40px; padding: 20px; border-top: 1px solid #eee;">
              <span style="font-size: 12px; color: #999;">Copyright &copy; Atlas DT. All rights reserved.</span>
            </div>
          </div>
        `;
    } else if (type === 'rfq_payment') {
        const { projectName, rfqId, amountPaid, paidAt } = body;
        const paidDate = paidAt ? new Date(paidAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Now';
        const refCode = `RFQ-${(rfqId || '').slice(0, 8).toUpperCase()}`;
        const amountFmt = `$${Number(amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        toEmailAddr = [email, 'info@atlasdt.com'];
        subject = `Payment Confirmed — ${projectName || refCode}`;
        htmlContent = `
          <div style="font-family:'Inter',sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#0f172a;">
            <div style="text-align:center;margin-bottom:32px;">
              <img src="${logoUrl}" alt="AtlasDT" style="height:36px;" />
            </div>
            <div style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:16px;padding:32px;text-align:center;margin-bottom:32px;">
              <div style="font-size:48px;margin-bottom:12px;">✅</div>
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Payment Confirmed</h1>
              <div style="color:#bbf7d0;font-size:14px;margin-top:8px;">Your manufacturing order is now confirmed</div>
            </div>
            <p style="font-size:15px;line-height:1.7;color:#334155;margin-bottom:24px;">
              Thank you for your payment. We've received your funds and your order is now in the production queue.
              Our team will be in touch shortly with a production schedule.
            </p>
            <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;margin-bottom:28px;">
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:14px 16px;font-weight:600;color:#64748b;font-size:13px;">Project</td>
                <td style="padding:14px 16px;font-weight:700;color:#0f172a;font-size:13px;">${projectName || '—'}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:14px 16px;font-weight:600;color:#64748b;font-size:13px;">Reference</td>
                <td style="padding:14px 16px;font-weight:700;color:#0f172a;font-size:13px;">${refCode}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:14px 16px;font-weight:600;color:#64748b;font-size:13px;">Amount Paid</td>
                <td style="padding:14px 16px;font-weight:800;color:#15803d;font-size:15px;">${amountFmt} USD</td>
              </tr>
              <tr>
                <td style="padding:14px 16px;font-weight:600;color:#64748b;font-size:13px;">Payment Date</td>
                <td style="padding:14px 16px;font-weight:700;color:#0f172a;font-size:13px;">${paidDate}</td>
              </tr>
            </table>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin-bottom:28px;font-size:13px;color:#1d4ed8;line-height:1.6;">
              <strong>What happens next?</strong><br/>
              Our engineering team will review your order and contact you within 1–2 business days with a production timeline and any questions.
            </div>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="https://www.atlasdt.com/workspace.html?tab=rfqs" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">View Your Order</a>
            </div>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
            <p style="text-align:center;font-size:11px;color:#94a3b8;">AtlasDT Manufacturing Hub &bull; Questions? <a href="mailto:info@atlasdt.com" style="color:#0ea5e9;">info@atlasdt.com</a></p>
          </div>
        `;
    }
    
    // ── bank_transfer_details ──────────────────────────────────
    if (type === 'bank_transfer_details') {
      const { projectName, name: clientName, amount, bankRef } = body;
      toEmailAddr = [email];
      subject = `Bank Transfer Instructions — ${projectName || bankRef}`;
      htmlContent = `
        <div style="font-family:'Inter',sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#0f172a;">
          <div style="text-align:center;margin-bottom:32px;">
            <img src="${logoUrl}" alt="AtlasDT" style="height:36px;" />
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:32px;text-align:center;margin-bottom:32px;">
            <div style="font-size:48px;margin-bottom:12px;">🏦</div>
            <h1 style="margin:0;color:#15803d;font-size:22px;font-weight:700;">Bank Transfer Instructions</h1>
            <div style="color:#16a34a;font-size:14px;margin-top:8px;">Please complete your payment to begin production</div>
          </div>
          <p style="font-size:15px;line-height:1.7;color:#334155;margin-bottom:24px;">
            Dear ${clientName || 'Valued Customer'},<br/><br/>
            Thank you for confirming your order for <strong>${projectName || 'your project'}</strong>. 
            Below are the bank details to complete your transfer. <strong>Please reply directly to this email and attach your payment receipt</strong> once the transfer is complete to speed up your order processing.
          </p>
          
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:28px;">
            <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">Transfer Details</div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
              <span style="color:#64748b;">Bank Name</span>
              <strong style="color:#0f172a;">NAB — National Australia Bank</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
              <span style="color:#64748b;">Account Name</span>
              <strong style="color:#0f172a;">Paniani Products Pty Ltd</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
              <span style="color:#64748b;">BSB</span>
              <strong style="color:#0f172a;">083-004</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
              <span style="color:#64748b;">Account No.</span>
              <strong style="color:#0f172a;">978 360 554</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:16px; font-size:14px;">
              <span style="color:#64748b;">SWIFT / BIC</span>
              <strong style="color:#0f172a;">NATAAU3303</strong>
            </div>
            
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-top:20px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#64748b;font-size:14px;">Total Amount</span>
                <strong style="color:#15803d;font-size:18px;">$${amount} AUD</strong>
              </div>
            </div>
          </div>

          <!-- Prominent reference box -->
          <div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:12px;padding:20px;margin-bottom:28px;text-align:center;">
            <div style="font-size:12px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">⚠️ Required Payment Reference</div>
            <div style="font-size:24px;font-weight:800;color:#0f172a;letter-spacing:2px;font-family:monospace;background:#fff;padding:12px;border-radius:8px;border:1px dashed #fcd34d;display:inline-block;margin-bottom:8px;">
              ${bankRef}
            </div>
            <div style="font-size:13px;color:#b45309;line-height:1.5;">
              You MUST include this exact reference in your bank transfer description.<br/>
              <strong>Do not forget to reply to this email with your receipt.</strong>
            </div>
          </div>

          <div style="text-align:center;margin-bottom:28px;">
            <a href="mailto:info@atlasdt.com?subject=Payment Receipt - ${bankRef}&body=Hi AtlasDT team,%0D%0A%0D%0APlease find attached the payment receipt for ${bankRef}.%0D%0A%0D%0AThank you," style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">Reply With Receipt</a>
          </div>
          
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="text-align:center;font-size:11px;color:#94a3b8;">AtlasDT Manufacturing Hub &bull; Questions? <a href="mailto:info@atlasdt.com" style="color:#0ea5e9;">info@atlasdt.com</a></p>
        </div>
      `;
    }

    // ── rfq_confirmed ──────────────────────────────────────────
    if (type === 'rfq_confirmed') {
      const { projectName, name: clientName, confirmedPrice, bankRef, rfqId } = body;
      const priceFmt = `${Number(confirmedPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      toEmailAddr = [email, 'info@atlasdt.com'];
      subject = `Quote Accepted — ${projectName || bankRef}`;
      htmlContent = `
        <div style="font-family:'Inter',sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#0f172a;background-color:#ffffff;">
          <div style="text-align:center;margin-bottom:32px;">
            <img src="${logoUrl}" alt="AtlasDT" width="180" style="width:180px; max-width:100%; display:block; margin:0 auto; height:auto;" />
          </div>
          
          <table width="100%" border="0" cellspacing="0" cellpadding="32" style="background-color:#1d4ed8; background:linear-gradient(135deg,#1d4ed8,#1e40af); border-radius:16px; margin-bottom:32px;">
            <tr>
              <td align="center" style="text-align:center;">
                <div style="font-size:48px; margin-bottom:12px; color:#ffffff;">🎉</div>
                <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; font-family:sans-serif;">Your Quote Has Been Accepted</h1>
                <p style="color:#bfdbfe; font-size:14px; margin-top:8px; margin-bottom:0; font-family:sans-serif;">Payment is now awaiting to confirm your order</p>
              </td>
            </tr>
          </table>
          
          <p style="font-size:15px;line-height:1.7;color:#334155;margin-bottom:24px; font-family:sans-serif;">
            Dear ${clientName || 'Valued Customer'},<br/><br/>
            We're pleased to inform you that we have reviewed and <strong>accepted your quotation request</strong> for the project listed below.
            Your order is now confirmed at the price indicated — please proceed with payment to move your project into production.
          </p>
          
          <table width="100%" border="0" cellspacing="0" cellpadding="14" style="background-color:#f8fafc; border-radius:12px; margin-bottom:28px; border-collapse:collapse;">
            <tr>
              <td style="font-weight:600; color:#64748b; font-size:13px; font-family:sans-serif; border-bottom:1px solid #e2e8f0; width:30%;">Project</td>
              <td style="font-weight:700; color:#0f172a; font-size:13px; font-family:sans-serif; border-bottom:1px solid #e2e8f0;">${projectName || '—'}</td>
            </tr>
            <tr>
              <td style="font-weight:600; color:#64748b; font-size:13px; font-family:sans-serif; border-bottom:1px solid #e2e8f0;">Reference</td>
              <td style="font-weight:700; color:#0f172a; font-size:13px; font-family:monospace; letter-spacing:0.5px; border-bottom:1px solid #e2e8f0;">${bankRef || '—'}</td>
            </tr>
            <tr>
              <td style="font-weight:600; color:#64748b; font-size:13px; font-family:sans-serif;">Confirmed Total</td>
              <td style="font-weight:800; color:#1d4ed8; font-size:15px; font-family:sans-serif;">US$${priceFmt}</td>
            </tr>
          </table>
          
          <table width="100%" border="0" cellspacing="0" cellpadding="16" style="background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; margin-bottom:28px;">
            <tr>
              <td style="font-size:13px; color:#1d4ed8; line-height:1.6; font-family:sans-serif;">
                <strong style="font-family:sans-serif;">Next Step — Payment</strong><br/>
                Please log in to your AtlasDT workspace to choose your preferred payment method (Stripe or Bank Transfer).
                Use reference <strong>${bankRef}</strong> if paying by bank transfer.
              </td>
            </tr>
          </table>
          
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
            <tr>
              <td align="center">
                <table border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" bgcolor="#1d4ed8" style="border-radius:10px;">
                      <a href="https://www.atlasdt.com/workspace.html?tab=rfqs${rfqId ? '&rfq=' + rfqId : ''}" target="_blank" style="font-size:14px; font-weight:700; font-family:sans-serif; color:#ffffff; text-decoration:none; padding:12px 28px; border:1px solid #1d4ed8; border-radius:10px; display:inline-block;">View &amp; Pay Now</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          
          <p style="font-size:14px;line-height:1.7;color:#64748b;margin-bottom:8px; font-family:sans-serif;">
            Questions about your quote? Reply to this email or contact us at
            <a href="mailto:info@atlasdt.com" style="color:#1d4ed8;">info@atlasdt.com</a> quoting reference <strong>${bankRef}</strong>.
          </p>
          <p style="font-size:14px;color:#64748b; font-family:sans-serif;">We look forward to manufacturing your project!<br/>— The AtlasDT Team</p>
          
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="text-align:center;font-size:11px;color:#94a3b8; font-family:sans-serif;">AtlasDT Manufacturing Hub &bull; <a href="https://www.atlasdt.com" style="color:#0ea5e9;">atlasdt.com</a></p>
        </div>
      `;
    }

    // ── rfq_rejected ──────────────────────────────────────────
    if (type === 'rfq_rejected') {
      const { projectName, name: clientName, bankRef, reasons } = body;
      const bulletList = (reasons || ['No specific reason provided']).map(r =>
        `<li style="margin-bottom:6px;">${r}</li>`
      ).join('');
      toEmailAddr = [email, 'info@atlasdt.com'];
      subject = `Update on Your Quote — ${projectName || bankRef}`;
      htmlContent = `
        <div style="font-family:'Inter',sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#0f172a;">
          <div style="text-align:center;margin-bottom:32px;">
            <img src="${logoUrl}" alt="AtlasDT" style="height:36px;" />
          </div>
          <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);border-radius:16px;padding:32px;text-align:center;margin-bottom:32px;">
            <div style="font-size:48px;margin-bottom:12px;">📋</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Quotation Not Accepted</h1>
            <div style="color:#fecaca;font-size:14px;margin-top:8px;">We've reviewed your request and have an update for you</div>
          </div>
          <p style="font-size:15px;line-height:1.7;color:#334155;margin-bottom:24px;">
            Dear ${clientName || 'Valued Customer'},<br/><br/>
            Thank you for reaching out to AtlasDT. After a thorough review of your quotation request for <strong>${projectName || 'your project'}</strong>,
            we are unfortunately unable to proceed with this order at this time.
          </p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
            <div style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:10px;">Reason(s) for non-acceptance:</div>
            <ul style="margin:0;padding-left:18px;font-size:13px;color:#7f1d1d;line-height:1.8;">
              ${bulletList}
            </ul>
          </div>
          <p style="font-size:14px;line-height:1.7;color:#334155;margin-bottom:20px;">
            We encourage you to revisit your requirements in light of the above and resubmit a revised quote.
            Our team is always happy to assist in clarifying specifications before submission.
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:28px;font-size:13px;color:#475569;line-height:1.6;">
            For any specific questions about this decision, please contact us at
            <a href="mailto:info@atlasdt.com" style="color:#1d4ed8;">info@atlasdt.com</a>
            quoting your reference number: <strong style="font-family:monospace;">${bankRef || '—'}</strong>
          </div>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="https://www.atlasdt.com" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">Submit a New Quote</a>
          </div>
          <p style="font-size:14px;color:#64748b;">Thank you for considering AtlasDT. We hope to work with you on a future project.<br/>— The AtlasDT Team</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="text-align:center;font-size:11px;color:#94a3b8;">AtlasDT Manufacturing Hub &bull; <a href="https://www.atlasdt.com" style="color:#0ea5e9;">atlasdt.com</a></p>
        </div>
      `;
    }

    // ── rfq_request_info ──────────────────────────────────────────
    if (type === 'rfq_request_info') {
      const { projectName, name: clientName, bankRef, staffEmail, staffName, message } = body;
      toEmailAddr = [email];
      subject = `Information Required for your Project — ${projectName || bankRef}`;
      htmlContent = `
        <div style="font-family:'Inter',sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#0f172a;">
          <div style="text-align:center;margin-bottom:32px;">
            <img src="${logoUrl}" alt="AtlasDT" style="height:36px;" />
          </div>
          <p style="font-size:15px;line-height:1.7;color:#334155;margin-bottom:24px;">
            Dear ${clientName || 'Valued Customer'},<br/><br/>
            Our engineering team is currently reviewing your quotation request for <strong>${projectName || 'your project'}</strong>, 
            but we need a bit more information before we can proceed.
          </p>
          <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:16px 20px;margin-bottom:28px;">
            <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.6;white-space:pre-wrap;">${message}</p>
          </div>
          <p style="font-size:14px;line-height:1.7;color:#334155;margin-bottom:20px;">
            Please reply directly to this email with the requested details, or reach out to your assigned engineer:
            <strong>${staffName || 'AtlasDT Engineering'}</strong> at <a href="mailto:${staffEmail}">${staffEmail}</a>.
          </p>
          <p style="font-size:14px;color:#64748b;">Thank you,<br/>— ${staffName || 'The AtlasDT Team'}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="text-align:center;font-size:11px;color:#94a3b8;">AtlasDT Manufacturing Hub &bull; <a href="https://www.atlasdt.com" style="color:#0ea5e9;">atlasdt.com</a></p>
        </div>
      `;
    } else if (type === 'rfq_document') {
      // ── Quotation / Proforma Invoice / Commercial Invoice with PDF attachment ──
      const { docTitle, docRef, rfqRef, total, projectName: projName, pdfBase64, pdfFileName } = body;
      toEmailAddr = [email];
      subject = `${docTitle} ${docRef} — ${projName || 'Your Project'} | AtlasDT`;
      const totalFmt = Number(total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      htmlContent = `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
          <div style="background:#0f172a;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
            <img src="${logoUrl}" alt="AtlasDT" style="height:36px;margin-bottom:8px;" />
            <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;">${docTitle}</h1>
            <p style="color:#94a3b8;font-size:13px;margin:4px 0 0;">${docRef} · ${rfqRef}</p>
          </div>
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px;">
            <p style="font-size:15px;line-height:1.7;color:#334155;margin-bottom:18px;">Dear ${name || 'Valued Customer'},</p>
            <p style="font-size:15px;line-height:1.7;color:#334155;margin-bottom:18px;">Please find attached your <strong>${docTitle}</strong> for project <strong>${projName || 'N/A'}</strong>.</p>
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px 20px;margin-bottom:20px;text-align:center;">
              <div style="font-size:12px;color:#166534;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-bottom:4px;">Total Amount</div>
              <div style="font-size:28px;font-weight:800;color:#15803d;">$${totalFmt}</div>
              <div style="font-size:11px;color:#4ade80;margin-top:4px;">USD</div>
            </div>
            <p style="font-size:14px;line-height:1.7;color:#334155;margin-bottom:18px;">The document is attached to this email as a PDF. Please review and don't hesitate to reach out if you have any questions.</p>
            <p style="font-size:14px;color:#64748b;">Kind regards,<br/><strong>The AtlasDT Team</strong></p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
            <p style="text-align:center;font-size:11px;color:#94a3b8;">AtlasDT Manufacturing Hub &bull; <a href="https://www.atlasdt.com" style="color:#0ea5e9;">atlasdt.com</a></p>
          </div>
        </div>
      `;
    }

    // ── marketplace_order — Customer Order Confirmation ──────────
    if (type === 'marketplace_order') {
      const { orderRef, items, shippingAddress, grandTotal, pretax, gst } = body;
      const totalFmt = `$${Number(grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      const pretaxFmt = `$${Number(pretax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      const gstFmt = `$${Number(gst || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      const itemCount = (items || []).length;
      const addrLines = shippingAddress
        ? [shippingAddress.name, shippingAddress.address1, shippingAddress.address2, [shippingAddress.city, shippingAddress.state, shippingAddress.zip].filter(Boolean).join(', ')].filter(Boolean).join('<br>')
        : '—';

      const itemRows = (items || []).map(i => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:12px 8px;font-size:13px;color:#0f172a;font-weight:600;">${i.mpn || i.name || '—'}</td>
          <td style="padding:12px 8px;font-size:13px;color:#475569;text-align:center;">${i.quantity || 1}</td>
          <td style="padding:12px 8px;font-size:13px;color:#475569;text-align:center;">${i.supplier_name || '—'}</td>
          <td style="padding:12px 8px;font-size:13px;color:#15803d;font-weight:700;text-align:right;">$${Number((i.price||0)*i.quantity).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
        </tr>
      `).join('');

      toEmailAddr = [email, 'info@atlasdt.com'];
      subject = `Order Confirmation — ${orderRef}`;
      htmlContent = `
        <div style="font-family:'Inter',sans-serif;max-width:640px;margin:0 auto;padding:32px 24px;color:#0f172a;">
          <div style="text-align:center;margin-bottom:32px;">
            <img src="${logoUrl}" alt="AtlasDT" style="height:36px;" />
          </div>
          <div style="background:linear-gradient(135deg,#0e7490,#0369a1);border-radius:16px;padding:32px;text-align:center;margin-bottom:32px;">
            <div style="font-size:48px;margin-bottom:12px;">🛒</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Order Confirmed</h1>
            <div style="color:#a5f3fc;font-size:14px;margin-top:8px;">Reference: ${orderRef}</div>
          </div>
          <p style="font-size:15px;line-height:1.7;color:#334155;margin-bottom:24px;">
            Hi ${name || email?.split('@')[0] || 'there'},<br><br>
            Thank you for your order! We've received your marketplace purchase and it is now being prepared for fulfillment.<br><br>
            <strong>What happens next?</strong> You will receive a separate email with your <strong>tracking number</strong> and shipping details once your items have been dispatched. Most orders ship within 2–5 business days.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;">Item</th>
                <th style="padding:10px 8px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;">Qty</th>
                <th style="padding:10px 8px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;">Supplier</th>
                <th style="padding:10px 8px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr style="border-top:2px solid #e2e8f0;">
                <td colspan="3" style="padding:10px 8px;text-align:right;font-size:13px;color:#64748b;font-weight:600;">Subtotal</td>
                <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${pretaxFmt}</td>
              </tr>
              <tr>
                <td colspan="3" style="padding:6px 8px;text-align:right;font-size:13px;color:#64748b;">GST (10%)</td>
                <td style="padding:6px 8px;text-align:right;font-size:13px;color:#475569;">${gstFmt}</td>
              </tr>
              <tr style="background:#f0fdf4;">
                <td colspan="3" style="padding:12px 8px;text-align:right;font-size:14px;font-weight:800;color:#0f172a;">Grand Total</td>
                <td style="padding:12px 8px;text-align:right;font-size:16px;font-weight:800;color:#15803d;">${totalFmt}</td>
              </tr>
            </tfoot>
          </table>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Delivery Address</div>
            <div style="font-size:13px;color:#0f172a;line-height:1.6;">${addrLines}</div>
          </div>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="https://www.atlasdt.com/workspace.html?tab=rfqs" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">Track Your Order</a>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="text-align:center;font-size:11px;color:#94a3b8;">AtlasDT Marketplace &bull; <a href="mailto:info@atlasdt.com" style="color:#0ea5e9;">info@atlasdt.com</a></p>
        </div>
      `;
    }

    // ── marketplace_supplier_notify — Supplier Fulfillment Alert ──
    if (type === 'marketplace_supplier_notify') {
      const { supplierName, orderRef, items, buyerEmail } = body;
      const itemRows = (items || []).map(i => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 8px;font-size:13px;font-weight:600;">${i.mpn || i.name || '—'}</td>
          <td style="padding:10px 8px;font-size:13px;text-align:center;">${i.quantity || 1}</td>
          <td style="padding:10px 8px;font-size:13px;text-align:right;">$${Number(i.price||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
        </tr>
      `).join('');

      toEmailAddr = [email, 'info@atlasdt.com'];
      subject = `⚡ New Marketplace Order — ${orderRef}`;
      htmlContent = `
        <div style="font-family:'Inter',sans-serif;max-width:640px;margin:0 auto;padding:32px 24px;color:#0f172a;">
          <div style="text-align:center;margin-bottom:32px;">
            <img src="${logoUrl}" alt="AtlasDT" style="height:36px;" />
          </div>
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:16px;padding:32px;text-align:center;margin-bottom:32px;">
            <div style="font-size:48px;margin-bottom:12px;">📦</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">New Order Received</h1>
            <div style="color:#fef3c7;font-size:14px;margin-top:8px;">Order: ${orderRef}</div>
          </div>
          <p style="font-size:15px;line-height:1.7;color:#334155;margin-bottom:24px;">
            Hi ${supplierName || 'Supplier'},<br><br>
            A new order has been placed through the AtlasDT Marketplace for your products. Please prepare the following items for fulfillment.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e2e8f0;">
            <thead>
              <tr style="background:#fffbeb;">
                <th style="padding:10px 8px;text-align:left;font-size:11px;color:#92400e;text-transform:uppercase;font-weight:700;">Part Number</th>
                <th style="padding:10px 8px;text-align:center;font-size:11px;color:#92400e;text-transform:uppercase;font-weight:700;">Quantity</th>
                <th style="padding:10px 8px;text-align:right;font-size:11px;color:#92400e;text-transform:uppercase;font-weight:700;">Unit Price</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:20px;">
            <strong>Buyer contact:</strong> ${buyerEmail || '—'}<br>
            Please fulfil and ship within the agreed lead time. Contact <a href="mailto:info@atlasdt.com" style="color:#0ea5e9;">info@atlasdt.com</a> if you have questions.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="https://www.atlasdt.com/seller/" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">Open Seller Dashboard</a>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="text-align:center;font-size:11px;color:#94a3b8;">AtlasDT Marketplace &bull; Supplier Notifications</p>
        </div>
      `;
    }

    // ── marketplace_cart_reminder — 24-hour Cart Abandonment ──────
    if (type === 'marketplace_cart_reminder') {
      const { items, cartTotal } = body;
      const totalFmt = `$${Number(cartTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      const itemRows = (items || []).slice(0, 5).map(i => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:12px 8px;">
            <div style="font-size:13px;font-weight:600;color:#0f172a;">${i.mpn || i.name || '—'}</div>
            <div style="font-size:11px;color:#64748b;">${i.supplier_name || ''}</div>
          </td>
          <td style="padding:12px 8px;text-align:center;font-size:13px;color:#475569;">${i.quantity || 1}</td>
          <td style="padding:12px 8px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">$${Number((i.price||0)*i.quantity).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
        </tr>
      `).join('');

      toEmailAddr = [email];
      subject = `You left items in your cart — Complete your order`;
      htmlContent = `
        <div style="font-family:'Inter',sans-serif;max-width:640px;margin:0 auto;padding:32px 24px;color:#0f172a;">
          <div style="text-align:center;margin-bottom:32px;">
            <img src="${logoUrl}" alt="AtlasDT" style="height:36px;" />
          </div>
          <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:16px;padding:32px;text-align:center;margin-bottom:32px;">
            <div style="font-size:48px;margin-bottom:12px;">🛒</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Your cart is waiting!</h1>
            <div style="color:#c4b5fd;font-size:14px;margin-top:8px;">Don't miss out on these components</div>
          </div>
          <p style="font-size:15px;line-height:1.7;color:#334155;margin-bottom:24px;">
            Hi ${name || 'there'},<br><br>
            You added items to your AtlasDT cart but haven't completed checkout yet. Your selected components are still available — complete your order before stock runs out.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;">Item</th>
                <th style="padding:10px 8px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;">Qty</th>
                <th style="padding:10px 8px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;">Price</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          ${(items||[]).length > 5 ? '<p style="font-size:12px;color:#94a3b8;text-align:center;margin-bottom:16px;">+ ' + ((items||[]).length - 5) + ' more items in your cart</p>' : ''}
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;text-align:center;margin-bottom:24px;">
            <div style="font-size:12px;color:#166534;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Cart Total</div>
            <div style="font-size:24px;font-weight:800;color:#15803d;">${totalFmt}</div>
          </div>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="https://www.atlasdt.com/app.html" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(124,58,237,0.3);">Complete Your Order →</a>
          </div>
          <p style="font-size:13px;color:#64748b;text-align:center;line-height:1.6;">
            Need help? Contact our sourcing team at <a href="mailto:info@atlasdt.com" style="color:#0ea5e9;">info@atlasdt.com</a>
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="text-align:center;font-size:11px;color:#94a3b8;">AtlasDT Marketplace &bull; <a href="https://www.atlasdt.com" style="color:#0ea5e9;">atlasdt.com</a></p>
        </div>
      `;
    }

    const resend = new Resend(RESEND_API_KEY);

    let fromAddress = 'AtlasDT System <system@atlasdt.com>';
    let replyToAddress = null;
    
    if (type === 'rfq_request_info' && body.staffEmail) {
       fromAddress = `AtlasDT - ${body.staffName || 'Engineering'} <system@atlasdt.com>`;
       replyToAddress = body.staffEmail;
    }

    // Marketplace emails use a branded from address
    if (type.startsWith('marketplace_')) {
       fromAddress = 'AtlasDT Marketplace <system@atlasdt.com>';
       replyToAddress = 'info@atlasdt.com';
    }

    const emailPayload = {
      from: fromAddress,
      to: toEmailAddr,
      subject: subject,
      html: htmlContent
    };

    // Attach PDF for document emails
    if (type === 'rfq_document' && body.pdfBase64 && body.pdfFileName) {
      emailPayload.attachments = [{
        filename: body.pdfFileName,
        content: body.pdfBase64,
      }];
    }

    if (type === 'rfq_request_info') {
      emailPayload.cc = 'info@atlasdt.com';
    }

    if (replyToAddress) {
       emailPayload.replyTo = replyToAddress;
    }

    const { data: resendRes, error: resendError } = await resend.emails.send(emailPayload);

    if (resendError) {
        console.error("Resend API Error:", resendError);
        return { statusCode: 500, body: JSON.stringify({ error: resendError }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Email dispatched successfully.", id: resendRes?.id })
    };

  } catch (error) {
    console.error("Email Dispatch Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
