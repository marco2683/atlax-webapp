exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body);

    const MICROSOFT_SHAREPOINT_WEBHOOK_URL = process.env.MICROSOFT_SHAREPOINT_WEBHOOK_URL;
    
    if (!MICROSOFT_SHAREPOINT_WEBHOOK_URL) {
      // If the webhook isn't configured yet, just gracefully return so it doesn't crash the frontend upload flow
      console.warn('MICROSOFT_SHAREPOINT_WEBHOOK_URL is not set. Skipping SharePoint sync.');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'SharePoint sync skipped (No Webhook URL configured)' })
      };
    }

    // Prepare payload for Power Automate to download the file and save to SharePoint
    const sharepointPayload = {
      file_name: payload.file_name,
      file_url: payload.file_url,
      folder_path: payload.folder_path || 'General',
      metadata: payload.metadata || {}
    };

    const response = await fetch(MICROSOFT_SHAREPOINT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sharepointPayload)
    });

    if (!response.ok) {
      throw new Error(`SharePoint Webhook responded with status: ${response.status}`);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'File synced to SharePoint successfully' })
    };

  } catch (error) {
    console.error('Error syncing to SharePoint webhook:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to sync to SharePoint' }) };
  }
};
