import os
import json
import time
import http.client
from dotenv import load_dotenv

load_dotenv()

def fetch_images():
    """
    Reads master_taxonomy_enriched.json and uses the Serper.dev Google API
    to fetch 10 high-resolution image URLs for each sub-technology.
    """
    serper_key = os.getenv('SERPER_API_KEY')
    if not serper_key:
        print("Error: SERPER_API_KEY environment variable not found.")
        return

    input_path = os.path.join(os.path.dirname(__file__), '..', 'webapp', 'src', 'data', 'taxonomy', 'master_taxonomy_enriched.json')
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return
        
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    technologies = data.get("technologies", [])
    print(f"Loaded {len(technologies)} items to fetch images for via Serper Google API.")
    
    try:
        for i, item in enumerate(technologies):
            # Check if this item already has >5 real URLs
            # Using 10 images now! We skip only if it already has our 10 URLs and they aren't unsplash.
            current_urls = item.get("images", [])
            # We enforce Serper re-fetch if we previously only had duckduckgo/unsplash (indicated by < 10 array length or unsplash)
            if current_urls and "unsplash.com" not in current_urls[0] and len(current_urls) >= 10:
                print(f"Skipping {item['name']}, already seems to have 10 real images.")
                continue

            # Deep Prompt Engineering for the search engine to get industrial aesthetics
            search_query = f"{item['name']} manufacturing process high resolution industrial macro -stock -watermark"
            print(f"[{i+1}/{len(technologies)}] Google Searching: '{search_query}'")
            
            try:
                conn = http.client.HTTPSConnection("google.serper.dev")
                payload = json.dumps({
                  "q": search_query,
                  "num": 20 # Grab 20, we will keep the top 10 safely
                })
                headers = {
                  'X-API-KEY': serper_key,
                  'Content-Type': 'application/json'
                }
                
                conn.request("POST", "/images", payload, headers)
                res = conn.getresponse()
                raw_data = res.read()
                response_dict = json.loads(raw_data.decode("utf-8"))
                
                if "images" in response_dict:
                    # Filter out known bad sites like pinterest
                    real_image_urls = []
                    for img in response_dict["images"]:
                        url = img.get("imageUrl", "")
                        if "pinterest" not in url and ".svg" not in url:
                            real_image_urls.append(url)
                            
                    # Keep exactly 10
                    if len(real_image_urls) > 0:
                        # Pad if needed
                        while len(real_image_urls) < 10:
                            real_image_urls.append(current_urls[len(real_image_urls) % len(current_urls)])
                            
                        item['images'] = real_image_urls[:10]
                    else:
                        print(f"-> No image results found for {item['name']}")
                else:
                    print(f"-> Serper API hit a snag for {item['name']}: {response_dict}")

            except Exception as e:
                print(f"-> Error fetching images: {e}")
                
            # Play nice with Serper, 1 request per second
            time.sleep(1)
            
            # Save progress incrementally every 10 queries
            if (i + 1) % 10 == 0:
                with open(input_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2)
                    
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Saving progress...")
        
    # Final save
    with open(input_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
        print(f"\nSUCCESS! 10x Image taxonomy saved to {input_path}")

if __name__ == '__main__':
    fetch_images()
