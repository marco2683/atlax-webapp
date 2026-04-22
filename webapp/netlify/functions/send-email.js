const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, userId, type, cover_letter } = JSON.parse(event.body);

    if (type !== 'designer_application') {
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

    // We can use native fetch or node-fetch for compatibility 
    const isGlobalFetch = typeof globalThis.fetch === 'function';
    const _fetch = isGlobalFetch ? globalThis.fetch : fetch;

    const resendReq = await _fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'AtlasDT System <system@atlasdt.com>', // Or a verified domain you own on Resend
        to: ['info@atlasdt.com'],
        subject: `New Designer Application: ${email}`,
        html: `
          <h2>New Designer Hub Application</h2>
          <p><strong>Applicant Email:</strong> ${email}</p>
          <p><strong>User ID:</strong> ${userId}</p>
          <h3>Cover Letter:</h3>
          <p style="white-space: pre-wrap; background: #eee; padding: 10px;">${cover_letter}</p>
          <hr />
          <p>Please log in to the Atlas DT Admin Panel to review their Resume and Portfolio links and approve this application.</p>
        `
      })
    });

    const resendRes = await resendReq.json();

    if (!resendReq.ok) {
        console.error("Resend API Error:", resendRes);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Email dispatched successfully.", id: resendRes.id })
    };

  } catch (error) {
    console.error("Email Dispatch Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
