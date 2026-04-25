const { Resend } = require('resend');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { email, userId, type, cover_letter, name } = body;

    const validTypes = ['designer_application', 'designer_approved', 'designer_rejected', 'project_rfq', 'rfq_removed', 'rfq_payment', 'rfq_confirmed', 'rfq_rejected', 'rfq_request_info'];
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
          <div style="font-family: 'Inter', sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${logoUrl}" alt="Atlas DT" style="height: 40px;" />
            </div>
            <h2 style="color: #0ea5e9; font-size: 22px; margin-bottom: 4px;">New Project Quote Request</h2>
            <p style="color: #6b7280; font-size: 14px; margin-top: 0;">A new RFQ has been submitted via the Project Quote engine.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; font-weight: 600; color: #374151; width: 140px;">Project Name</td>
                <td style="padding: 10px 0; color: #111827;">${projectName || '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; font-weight: 600; color: #374151;">Service</td>
                <td style="padding: 10px 0; color: #111827;">${serviceLabels[service] || service || '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; font-weight: 600; color: #374151;">Est. Quantity</td>
                <td style="padding: 10px 0; color: #111827;">${quantity || '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; font-weight: 600; color: #374151;">Timeline</td>
                <td style="padding: 10px 0; color: #111827;">${timelineLabels[timeline] || timeline || '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; font-weight: 600; color: #374151;">Files Uploaded</td>
                <td style="padding: 10px 0; color: #111827;">${fileCount || 0} file(s)</td>
              </tr>
            </table>

            <h3 style="font-size: 14px; color: #374151; margin-bottom: 8px;">Uploaded Files</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">${fileListHtml}</ul>

            <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-top: 24px;">
              <h3 style="font-size: 14px; color: #374151; margin: 0 0 8px;">Requester</h3>
              <p style="margin: 4px 0; font-size: 14px; color: #111827;"><strong>${name || '—'}</strong></p>
              <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">${email || '—'}</p>
              ${company ? `<p style="margin: 4px 0; font-size: 13px; color: #6b7280;">${company}</p>` : ''}
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0 16px;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              Please log in to the <a href="https://atlasdt.com/admin.html" style="color: #0ea5e9;">Admin Panel</a> to review this request.
            </p>
            <div style="text-align: center; margin-top: 20px;">
              <span style="font-size: 11px; color: #999;">Copyright &copy; Atlas DT. All rights reserved.</span>
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

    // ── rfq_confirmed ──────────────────────────────────────────
    if (type === 'rfq_confirmed') {
      const { projectName, name: clientName, confirmedPrice, bankRef } = body;
      const priceFmt = `$${Number(confirmedPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      toEmailAddr = [email, 'info@atlasdt.com'];
      subject = `Quote Accepted — ${projectName || bankRef}`;
      htmlContent = `
        <div style="font-family:'Inter',sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#0f172a;">
          <div style="text-align:center;margin-bottom:32px;">
            <img src="${logoUrl}" alt="AtlasDT" style="height:36px;" />
          </div>
          <div style="background:linear-gradient(135deg,#1d4ed8,#1e40af);border-radius:16px;padding:32px;text-align:center;margin-bottom:32px;">
            <div style="font-size:48px;margin-bottom:12px;">🎉</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Your Quote Has Been Accepted</h1>
            <div style="color:#bfdbfe;font-size:14px;margin-top:8px;">Payment is now awaiting to confirm your order</div>
          </div>
          <p style="font-size:15px;line-height:1.7;color:#334155;margin-bottom:24px;">
            Dear ${clientName || 'Valued Customer'},<br/><br/>
            We're pleased to inform you that we have reviewed and <strong>accepted your quotation request</strong> for the project listed below.
            Your order is now confirmed at the price indicated — please proceed with payment to move your project into production.
          </p>
          <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;margin-bottom:28px;">
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:14px 16px;font-weight:600;color:#64748b;font-size:13px;">Project</td>
              <td style="padding:14px 16px;font-weight:700;color:#0f172a;font-size:13px;">${projectName || '—'}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:14px 16px;font-weight:600;color:#64748b;font-size:13px;">Reference</td>
              <td style="padding:14px 16px;font-weight:700;color:#0f172a;font-size:13px;font-family:monospace;letter-spacing:0.5px;">${bankRef || '—'}</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;font-weight:600;color:#64748b;font-size:13px;">Confirmed Total</td>
              <td style="padding:14px 16px;font-weight:800;color:#1d4ed8;font-size:15px;">${priceFmt} AUD</td>
            </tr>
          </table>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin-bottom:28px;font-size:13px;color:#1d4ed8;line-height:1.6;">
            <strong>Next Step — Payment</strong><br/>
            Please log in to your AtlasDT workspace to choose your preferred payment method (Stripe or Bank Transfer).
            Use reference <strong>${bankRef}</strong> if paying by bank transfer.
          </div>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="https://www.atlasdt.com/workspace.html?tab=rfqs" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">View &amp; Pay Now</a>
          </div>
          <p style="font-size:14px;line-height:1.7;color:#64748b;margin-bottom:8px;">
            Questions about your quote? Reply to this email or contact us at
            <a href="mailto:info@atlasdt.com" style="color:#1d4ed8;">info@atlasdt.com</a> quoting reference <strong>${bankRef}</strong>.
          </p>
          <p style="font-size:14px;color:#64748b;">We look forward to manufacturing your project!<br/>— The AtlasDT Team</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="text-align:center;font-size:11px;color:#94a3b8;">AtlasDT Manufacturing Hub &bull; <a href="https://www.atlasdt.com" style="color:#0ea5e9;">atlasdt.com</a></p>
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
    }

    const resend = new Resend(RESEND_API_KEY);

    let fromAddress = 'AtlasDT System <system@atlasdt.com>';
    let replyToAddress = null;
    
    if (type === 'rfq_request_info' && body.staffEmail) {
       fromAddress = `${body.staffName || 'AtlasDT Engineering'} <system@atlasdt.com>`;
       replyToAddress = body.staffEmail;
    }

    const emailPayload = {
      from: fromAddress,
      to: toEmailAddr,
      subject: subject,
      html: htmlContent
    };
    if (replyToAddress) {
       emailPayload.reply_to = replyToAddress;
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
