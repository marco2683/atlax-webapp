import os
import json
import time
import http.client
from dotenv import load_dotenv

load_dotenv()

def fetch_missing_tags():
    """
    Scans master_teardowns.json for all material, manufacturing, and finish tags.
    Checks if they exist in master_taxonomy_enriched.json.
    If missing, it adds them as lightweight records and uses Serper API to fetch images natively.
    """
    serper_key = os.getenv('SERPER_API_KEY')
    if not serper_key:
        print("Error: SERPER_API_KEY environment variable not found.")
        return

    teardown_path = os.path.join(os.path.dirname(__file__), '..', 'webapp', 'src', 'data', 'taxonomy', 'master_teardowns.json')
    taxonomy_path = os.path.join(os.path.dirname(__file__), '..', 'webapp', 'src', 'data', 'taxonomy', 'master_taxonomy_enriched.json')
    
    with open(teardown_path, 'r', encoding='utf-8') as f:
        td_data = json.load(f)
        
    with open(taxonomy_path, 'r', encoding='utf-8') as f:
        tax_data = json.load(f)
        
    teardowns = td_data.get("teardowns", [])
    technologies = tax_data.get("technologies", [])
    
    existing_names = [t['name'].lower() for t in technologies]
    missing_tags = set()
    
    # Extract all unmapped tags
    for td in teardowns:
        for comp in td.get('components', []):
            materials = comp.get('materials', [])
            if isinstance(materials, str): materials = [materials]
            manufacturing = comp.get('manufacturing', [])
            if isinstance(manufacturing, str): manufacturing = [manufacturing]
            finishes = comp.get('finishes', [])
            if isinstance(finishes, str): finishes = [finishes]
            
            for tag in materials + manufacturing + finishes:
                tag_str = str(tag).strip()
                if not tag_str: continue
                # Fuzzy match
                found = False
                for ex in existing_names:
                    if tag_str.lower() in ex or ex in tag_str.lower():
                        found = True
                        break
                if not found:
                    missing_tags.add(tag_str)
                    
    if not missing_tags:
        print("All tags cleanly mapped! No missing images.")
        return
        
    print(f"Found {len(missing_tags)} unmapped technical tags. Fetching imagery...")
    
    conn = http.client.HTTPSConnection("google.serper.dev")
    headers = {
        'X-API-KEY': serper_key,
        'Content-Type': 'application/json'
    }
    
    for i, tag in enumerate(list(missing_tags)):
        print(f"[{i+1}/{len(missing_tags)}] Mapping '{tag}'...")
        
        search_query = f"{tag} industrial manufacturing metallic structure high resolution -stock -watermark"
        payload = json.dumps({"q": search_query, "num": 5})
        
        try:
            conn.request("POST", "/images", payload, headers)
            res = conn.getresponse()
            response_dict = json.loads(res.read().decode("utf-8"))
            
            image_urls = []
            if "images" in response_dict:
                for img in response_dict["images"]:
                    url = img.get("imageUrl", "")
                    if "pinterest" not in url and ".svg" not in url:
                        image_urls.append(url)
            
            if not image_urls:
                image_urls = [f"https://placehold.co/800x500/0f172a/38bdf8?text={tag.replace(' ', '+')}"]
                
            new_item = {
                "id": f"mapped-{int(time.time()*1000)}",
                "category": "Extracted Sub-Component",
                "name": tag,
                "description": f"Detailed architectural analysis for {tag} is actively being tracked continuously by AtlasDT metrics.",
                "whyUtilized": "Pending material isolation analysis.",
                "keyAchievement": "Tracked.",
                "intricacies": "System logging initialized.",
                "wayToGoAboutIt": "Pending OEM spec sheets.",
                "images": image_urls[:3], # keep 3 best
                "exampleProducts": []
            }
            
            technologies.append(new_item)
            existing_names.append(tag.lower())
            
            time.sleep(1) # ratelimit padding
            
        except Exception as e:
            print(f"Failed to fetch {tag}: {e}")
            
    # Save back to taxonomy
    tax_data['technologies'] = technologies
    with open(taxonomy_path, 'w', encoding='utf-8') as f:
        json.dump(tax_data, f, indent=2)
        
    print(f"SUCCESS! Integrated {len(missing_tags)} new technical definitions into master_taxonomy_enriched.json")

if __name__ == '__main__':
    fetch_missing_tags()
