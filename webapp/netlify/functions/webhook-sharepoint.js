exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body);
    console.log('[webhook-sharepoint] Received payload:', JSON.stringify(payload, null, 2));

    const MICROSOFT_SHAREPOINT_WEBHOOK_URL = process.env.MICROSOFT_PLANNER_WEBHOOK_URL || process.env.MICROSOFT_SHAREPOINT_WEBHOOK_URL;
    
    if (!MICROSOFT_SHAREPOINT_WEBHOOK_URL) {
      console.warn('[webhook-sharepoint] No webhook URL found. Checked MICROSOFT_PLANNER_WEBHOOK_URL and MICROSOFT_SHAREPOINT_WEBHOOK_URL.');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: 'SharePoint sync skipped (No Webhook URL configured)' })
      };
    }

    console.log('[webhook-sharepoint] Forwarding to Power Automate URL (first 80 chars):', MICROSOFT_SHAREPOINT_WEBHOOK_URL.slice(0, 80) + '...');

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

    console.log('[webhook-sharepoint] Power Automate response status:', response.status);
    const responseText = await response.text().catch(() => '');
    console.log('[webhook-sharepoint] Power Automate response body:', responseText.slice(0, 500));

    if (!response.ok) {
      throw new Error(`SharePoint Webhook responded with status: ${response.status} — ${responseText.slice(0, 200)}`);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'File synced to SharePoint successfully' })
    };

  } catch (error) {
    console.error('[webhook-sharepoint] Error syncing to SharePoint webhook:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to sync to SharePoint: ' + error.message }) };
  }
};
