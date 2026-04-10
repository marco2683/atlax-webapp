import os
import json
import time
import http.client
from dotenv import load_dotenv

load_dotenv()

def fetch_component_images():
    """
    Reads master_teardowns.json and uses the Serper.dev Google API
    to fetch an isolated hardware image for each specific component.
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
    print(f"Loaded {len(teardowns)} products for component image fetching.")
    
    try:
        for i, td in enumerate(teardowns):
            product_name = td.get('productName', '')
            components = td.get('components', [])
            
            for j, comp in enumerate(components):
                comp_name = comp.get('name', '')
                
                # If image is already populated reliably (e.g. not a placeholder or empty), skip it
                if "image" in comp and comp["image"] and "placehold" not in comp["image"]:
                    continue
                    
                search_query = f"{product_name} {comp_name} hardware component isolated high quality -patent -drawing -sketch -illustration"
                print(f"[{i+1}/{len(teardowns)}][{j+1}/{len(components)}] Searching: '{search_query}'")
                
                try:
                    conn = http.client.HTTPSConnection("google.serper.dev")
                    payload = json.dumps({
                      "q": search_query,
                      "num": 5
                    })
                    headers = {
                      'X-API-KEY': serper_key,
                      'Content-Type': 'application/json'
                    }
                    
                    conn.request("POST", "/images", payload, headers)
                    res = conn.getresponse()
                    raw_data = res.read()
                    response_dict = json.loads(raw_data.decode("utf-8"))
                    
                    found_img = False
                    if "images" in response_dict:
                        for img in response_dict["images"]:
                            url = img.get("imageUrl", "")
                            if "pinterest" not in url and ".svg" not in url:
                                comp["image"] = url
                                found_img = True
                                break
                                
                    if not found_img:
                        print(f"-> No image found for {comp_name}")
                        
                except Exception as e:
                    print(f"-> Error fetching component image: {e}")
                    
                # 1 sec interval
                time.sleep(1)
                
            # Incremental save per product
            with open(input_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
                
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Saving progress...")
        
    with open(input_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
        print(f"\nSUCCESS! Component images injected into {input_path}")

if __name__ == '__main__':
    fetch_component_images()
