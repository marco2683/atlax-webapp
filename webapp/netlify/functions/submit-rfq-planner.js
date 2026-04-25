exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body);

    // Microsoft Webhook URL for Planner
    // Kept securely as an environment variable to prevent GitHub alerts.
    const MICROSOFT_PLANNER_WEBHOOK_URL = process.env.MICROSOFT_PLANNER_WEBHOOK_URL;
    
    if (!MICROSOFT_PLANNER_WEBHOOK_URL) {
      throw new Error('MICROSOFT_PLANNER_WEBHOOK_URL environment variable is missing.');
    }

    // Match the schema the user configured in Power Automate
    const microsoftPayload = {
      customer_name: payload.customer_name || 'Unknown Customer',
      email: payload.email || 'No Email',
      part_name: payload.part_name || 'Unknown Part',
      material: payload.material || 'Various',
      estimated_cost: payload.estimated_cost || 'N/A'
    };

    const response = await fetch(MICROSOFT_PLANNER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(microsoftPayload)
    });

    if (!response.ok) {
      throw new Error(`Microsoft Webhook responded with status: ${response.status}`);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Planner task created' })
    };

  } catch (error) {
    console.error('Error submitting to Planner webhook:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create Planner task' }) };
  }
};
