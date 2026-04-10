/**
 * Serverless Curator Search — proxies image queries to Serper API.
 * Supports mode-aware query building (product vs process) and returns
 * a batch of image results for the admin curator.
 *
 * POST /.netlify/functions/curator-search
 * Body: { query, extraKeywords?, mode?, num? }
 */

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SERPER_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SERPER_API_KEY not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { query = '', extraKeywords = '', mode = 'product', num = 40 } = body;

  if (!query) {
    return { statusCode: 400, body: JSON.stringify({ error: 'query is required' }) };
  }

  // Build mode-aware search query
  let searchQuery;
  const kw = extraKeywords.trim();

  if (mode === 'product') {
    // Product/Outcome mode — prioritize user keywords, technology as qualifier
    if (kw) {
      searchQuery = `${kw} made with ${query} product`;
    } else {
      searchQuery = `${query} product example result`;
    }
  } else {
    // Process/Factory mode — manufacturing-focused
    if (kw) {
      searchQuery = `${query} ${kw} manufacturing process`;
    } else {
      searchQuery = `${query} manufacturing process factory`;
    }
  }

  try {
    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: searchQuery, num: Math.min(num, 100) })
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, body: JSON.stringify({ error: `Serper API error: ${errText}` }) };
    }

    const data = await response.json();
    const images = (data.images || []).map(img => ({
      url: img.imageUrl,
      title: img.title || '',
      source: img.source || '',
      width: img.imageWidth,
      height: img.imageHeight
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ images, total: images.length, query: searchQuery })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
