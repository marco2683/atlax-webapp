const { Resend } = require('resend');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, userId, type, cover_letter, name } = JSON.parse(event.body);

    const validTypes = ['designer_application', 'designer_approved', 'designer_rejected'];
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
