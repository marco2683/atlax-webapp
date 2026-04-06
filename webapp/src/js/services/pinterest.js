// src/js/services/pinterest.js

/**
 * Service to interact with the Pinterest API for visual moodboarding.
 */

// We will attempt to get this from env/vite settings, but fallback if not present.
// The user should set this in their .env as VITE_PINTEREST_ACCESS_TOKEN
const PINTEREST_TOKEN = import.meta.env.VITE_PINTEREST_ACCESS_TOKEN || '';

/**
 * Fetches board details and pins (images) from a Pinterest board.
 * @param {string} boardId 
 * @returns {Promise<Array<string>>} Array of image URLs
 */
export async function fetchPinterestMoodboard(boardId) {
  if (!PINTEREST_TOKEN) {
    console.warn("No Pinterest Access Token found. Provide VITE_PINTEREST_ACCESS_TOKEN.");
    return mockImages();
  }

  if (!boardId) return mockImages();

  try {
    // 1. You can inspect the board details if required:
    // const boardRes = await fetch(`https://api.pinterest.com/v5/boards/${boardId}`, {
    //   headers: {
    //     'Authorization': `Bearer ${PINTEREST_TOKEN}`,
    //     'Content-Type': 'application/json',
    //     'Accept': 'application/json',
    //   }
    // });
    
    // 2. Fetch the pins inside the board for the actual images
    // Assuming API endpoint: GET /v5/boards/{board_id}/pins
    const pinsRes = await fetch(`https://api.pinterest.com/v5/boards/${boardId}/pins`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PINTEREST_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    if (!pinsRes.ok) {
      console.error("Pinterest API error:", await pinsRes.text());
      return mockImages();
    }

    const data = await pinsRes.json();
    const items = data.items || [];
    
    // Extract the highest quality image from the pins
    const imgUrls = items.map(pin => {
      // Pin media object structure usually contains images dict
      const imgDict = pin.media?.images;
      if (!imgDict) return null;
      // Try 'originals' or highest resolution available
      return imgDict['originals']?.url || imgDict['600x']?.url || imgDict['400x300']?.url;
    }).filter(url => url !== null);

    return imgUrls.slice(0, 4); // return up to 4 images
  } catch (err) {
    console.error("Pinterest service error", err);
    return mockImages();
  }
}

function mockImages() {
  return [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1550009158-9ebf6d1736ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
  ];
}
