"""
Admin Image Curator — Flask micro-API for browsing and adding images to the taxonomy.

Endpoints:
  GET  /api/taxonomy       → Returns full taxonomy JSON
  POST /api/search-images  → {query, extraKeywords?, offset?} → returns 5 Serper image results
  POST /api/add-image      → {techId, imageUrl} → appends URL to that tech's images[]
  POST /api/remove-image   → {techId, imageUrl} → removes URL from that tech's images[]

Strategy:
  Serper doesn't paginate images reliably. So we fetch a LARGE batch (100) on the
  first request, cache it in memory keyed by query, and serve 5 at a time.
  "Generate More" just advances the pointer. Changing keywords resets the cache.

Run:
  python execution/admin_image_curator.py
  → Starts on http://localhost:5050
"""

import os
import json
import hashlib
import http.client
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

TAXONOMY_PATH = os.path.join(
    os.path.dirname(__file__), '..', 'webapp', 'src', 'data', 'taxonomy',
    'master_taxonomy_enriched.json'
)

# In-memory cache: { query_hash: [list of image dicts] }
_image_cache = {}

BATCH_SIZE = 5  # How many images to return per request


def _read_taxonomy():
    """Read and return the full taxonomy JSON."""
    with open(TAXONOMY_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def _write_taxonomy(data):
    """Write the taxonomy JSON back to disk."""
    with open(TAXONOMY_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _make_cache_key(query, extra, mode):
    """Create a unique cache key from the query + extra keywords + mode."""
    raw = f"{query.strip().lower()}||{extra.strip().lower()}||{mode}"
    return hashlib.md5(raw.encode()).hexdigest()


def _fetch_all_images(query, extra_keywords, mode='product'):
    """Fetch up to 100 images from Serper and return the filtered list."""
    serper_key = os.getenv('SERPER_API_KEY')
    if not serper_key:
        raise RuntimeError('SERPER_API_KEY not configured')

    # Build the query based on mode
    exclude = "-stock -watermark -pinterest -shutterstock -alamy -istockphoto -gettyimages -dreamstime"
    
    if mode == 'process':
        # Process mode: show the manufacturing process itself
        parts = [query]
        if extra_keywords.strip():
            parts.append(extra_keywords.strip())
        parts.append(f"manufacturing process factory {exclude}")
        search_query = " ".join(parts)
    else:
        # Product mode (default): show OUTCOMES — products made with this tech
        # Extra keywords lead, tech name becomes a qualifier
        if extra_keywords.strip():
            # User specified what they want — lead with that
            search_query = f"{extra_keywords.strip()} made with {query} high quality product {exclude}"
        else:
            # No extra keywords — search for products/examples of this technology
            search_query = f"{query} product example finished part high quality {exclude}"

    conn = http.client.HTTPSConnection("google.serper.dev")
    headers = {
        'X-API-KEY': serper_key,
        'Content-Type': 'application/json'
    }
    payload = json.dumps({
        "q": search_query,
        "num": 100,  # Fetch the maximum batch
        "gl": "us"
    })
    conn.request("POST", "/images", payload, headers)
    res = conn.getresponse()
    response_dict = json.loads(res.read().decode("utf-8"))

    images = []
    seen_urls = set()
    if "images" in response_dict:
        for img in response_dict["images"]:
            url = img.get("imageUrl", "")
            # Filter junk
            if any(skip in url.lower() for skip in [
                'pinterest', '.svg', 'facebook', 'twitter', 'tiktok',
                'shutterstock', 'alamy', 'istockphoto', 'dreamstime',
                'gettyimages', '123rf', 'depositphotos'
            ]):
                continue
            # Deduplicate
            if url in seen_urls:
                continue
            seen_urls.add(url)

            images.append({
                'url': url,
                'title': img.get('title', ''),
                'source': img.get('source', ''),
                'width': img.get('imageWidth', 0),
                'height': img.get('imageHeight', 0)
            })

    print(f"  → Fetched {len(images)} unique images for: {search_query[:80]}")
    return images


@app.route('/api/taxonomy', methods=['GET'])
def get_taxonomy():
    """Return the full taxonomy for populating dropdowns."""
    try:
        data = _read_taxonomy()
        techs = data.get('technologies', [])
        items = []
        for t in techs:
            items.append({
                'id': t.get('id', ''),
                'name': t.get('name', ''),
                'category': t.get('category', ''),
                'imageCount': len(t.get('images', []))
            })
        return jsonify({'technologies': items})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/search-images', methods=['POST'])
def search_images():
    """
    Search for images. Uses server-side caching:
    - First call for a query: fetches 100 from Serper, caches, returns first 5
    - Subsequent calls (offset > 0): returns next 5 from cache
    - forceRefresh=true: clears cache and fetches fresh
    """
    body = request.get_json(force=True)
    query = body.get('query', '')
    extra_keywords = body.get('extraKeywords', '')
    offset = body.get('offset', 0)
    force_refresh = body.get('forceRefresh', False)
    mode = body.get('mode', 'product')  # 'product' or 'process'

    if not query:
        return jsonify({'error': 'query is required'}), 400

    cache_key = _make_cache_key(query, extra_keywords, mode)

    try:
        # Fetch fresh if not cached, or if forced refresh
        if cache_key not in _image_cache or force_refresh:
            _image_cache[cache_key] = _fetch_all_images(query, extra_keywords, mode)

        all_images = _image_cache[cache_key]
        batch = all_images[offset : offset + BATCH_SIZE]
        total = len(all_images)

        return jsonify({
            'images': batch,
            'query': query,
            'offset': offset,
            'total': total,
            'hasMore': (offset + BATCH_SIZE) < total
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/add-image', methods=['POST'])
def add_image():
    """Add an image URL to a specific technology's images array."""
    body = request.get_json(force=True)
    tech_id = body.get('techId', '')
    image_url = body.get('imageUrl', '')

    if not tech_id or not image_url:
        return jsonify({'error': 'techId and imageUrl are required'}), 400

    try:
        data = _read_taxonomy()
        techs = data.get('technologies', [])

        for t in techs:
            if t.get('id') == tech_id:
                if 'images' not in t:
                    t['images'] = []
                if image_url not in t['images']:
                    t['images'].append(image_url)
                _write_taxonomy(data)
                return jsonify({'success': True, 'techId': tech_id, 'imageCount': len(t['images'])})

        return jsonify({'error': f'Technology ID "{tech_id}" not found'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/remove-image', methods=['POST'])
def remove_image():
    """Remove an image URL from a technology's images array."""
    body = request.get_json(force=True)
    tech_id = body.get('techId', '')
    image_url = body.get('imageUrl', '')

    if not tech_id or not image_url:
        return jsonify({'error': 'techId and imageUrl are required'}), 400

    try:
        data = _read_taxonomy()
        techs = data.get('technologies', [])

        for t in techs:
            if t.get('id') == tech_id:
                if 'images' in t and image_url in t['images']:
                    t['images'].remove(image_url)
                _write_taxonomy(data)
                return jsonify({'success': True, 'techId': tech_id, 'imageCount': len(t.get('images', []))})

        return jsonify({'error': f'Technology ID "{tech_id}" not found'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("  AtlasDT Image Curator API")
    print("  Running on http://localhost:5050")
    print("  Cache strategy: fetch 100 → serve 5 at a time")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5050, debug=True)
