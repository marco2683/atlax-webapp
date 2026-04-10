import os
import json
import time
import http.client
from dotenv import load_dotenv

load_dotenv()

def fetch_teardown_images():
    """
    Reads master_teardowns.json and pulls 5 high-quality Serper images (including exploded views)
    for each product.
    """
    serper_key = os.getenv('SERPER_API_KEY')
    if not serper_key:
        print("Error: SERPER_API_KEY environment variable not found.")
        return

    input_path = os.path.join(os.path.dirname(__file__), '..', 'webapp', 'src', 'data', 'taxonomy', 'master_teardowns.json')
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return
        
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    teardowns = data.get("teardowns", [])
    print(f"Loaded {len(teardowns)} products to fetch imagery for.")
    
    try:
        for i, td in enumerate(teardowns):
            # Forcing overwrite to replace old patent images

            product_name = td.get('productName', '')
            search_query = f"{product_name} hardware teardown internal structural components high resolution -patent -drawing -illustration -sketch -white -photography -macro -camera"
            print(f"[{i+1}/{len(teardowns)}] Google Searching: '{search_query}'")
            
            try:
                conn = http.client.HTTPSConnection("google.serper.dev")
                payload = json.dumps({
                  "q": search_query,
                  "num": 10
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
                    real_image_urls = []
                    for img in response_dict["images"]:
                        url = img.get("imageUrl", "")
                        if "pinterest" not in url and ".svg" not in url:
                            real_image_urls.append(url)
                            
                    if len(real_image_urls) > 0:
                        td['images'] = real_image_urls[:5]
                    else:
                        print(f"-> No image results found for {product_name}")
                else:
                    print(f"-> Serper API hit a snag for {product_name}: {response_dict}")

            except Exception as e:
                print(f"-> Error fetching teardown images: {e}")
                
            time.sleep(1) # 1 sec pace
            
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Saving progress...")
        
    with open(input_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
        print(f"\nSUCCESS! Teardown images saved to {input_path}")

if __name__ == '__main__':
    fetch_teardown_images()
