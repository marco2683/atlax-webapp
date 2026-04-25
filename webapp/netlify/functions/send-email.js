const { Resend } = require('resend');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { email, userId, type, cover_letter, name } = body;

    const validTypes = ['designer_application', 'designer_approved', 'designer_rejected', 'project_rfq', 'rfq_removed'];
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
    }

    const resend = new Resend(RESEND_API_KEY);

    const { data: resendRes, error: resendError } = await resend.emails.send({
      from: 'AtlasDT System <system@atlasdt.com>',
      to: toEmailAddr,
      subject: subject,
      html: htmlContent
    });

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
