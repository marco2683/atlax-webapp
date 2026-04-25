exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse the incoming JSON payload from the frontend
    const payload = JSON.parse(event.body);

    // The secure Webhook URL is now loaded from Netlify Environment Variables
    // to prevent GitGuardian/GitHub secret scanning alerts.
    const MICROSOFT_WEBHOOK_URL = process.env.MICROSOFT_WEBHOOK_URL;
    
    if (!MICROSOFT_WEBHOOK_URL) {
      throw new Error('MICROSOFT_WEBHOOK_URL environment variable is missing.');
    }

    // Forward the data to Microsoft
    const response = await fetch(MICROSOFT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: payload.name || 'Not provided',
        email: payload.email || 'Not provided',
        company: payload.company || 'Not provided',
        message: payload.message || 'No message provided'
      })
    });

    if (!response.ok) {
      throw new Error(`Microsoft Webhook responded with status: ${response.status}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ success: true, message: 'Lead submitted to Microsoft successfully.' })
    };

  } catch (error) {
    console.error('Error submitting contact form:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process submission' })
    };
  }
};
