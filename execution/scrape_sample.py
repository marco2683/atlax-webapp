import json
import os
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

API_KEY = None
if os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as env_f:
        for line in env_f:
            if line.startswith("FIRECRAWL_API_KEY="):
                API_KEY = line.strip().split("=")[1].strip()

INPUT_JSON = os.path.join("webapp", "public", "cms", "suppliers.json")
OUTPUT_JSON = os.path.join("webapp", "public", "cms", "test_enriched_sample.json")

SCHEMA = {
  "type": "object",
  "properties": {
    "group": { "type": "string" },
    "companyType": { "type": "string" },
    "city": { "type": "string" },
    "country": { "type": "string" },
    "description": { "type": "string" },
    "technologies": { "type": "array", "items": { "type": "string" } },
    "tags": { "type": "array", "items": { "type": "string" } },
    "certifications": { "type": "array", "items": { "type": "string" } },
    "moq": { "type": "string" },
    "leadTime": { "type": "string" },
    "images": {
      "type": "object",
      "properties": {
        "banner": { "description": "Absolute URL of the main hero/banner image.", "type": "string" },
        "product": { "description": "Array of absolute URLs of product images.", "type": "array", "items": { "type": "string" } },
        "facility": { "description": "Array of absolute URLs of facility or factory images.", "type": "array", "items": { "type": "string" } },
        "equipment": { "description": "Array of absolute URLs of machinery or equipment images.", "type": "array", "items": { "type": "string" } }
      }
    }
  }
}

PROMPT = """
You are analyzing a supplier's website. Extract the company profile information according to the strict schema.
Interpret the data carefully, specially when parsing tags and information about their specific technologies (e.g. 5-Axis CNC Milling, Injection Molding, etc). 
Also find MOQ, lead time, certifications, and high-level company description.
Crucially, extract fully qualified absolute image URLs (starting with http/https) for the company's banner, products, facilities, and equipment. Only extract valid real image URLs found on the page.
"""

def extract_one(sup):
    url = sup.get("url")
    if not url or not url.startswith("http"):
        return None
        
    print(f"Scraping {url}...")
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "urls": [url],
        "prompt": PROMPT,
        "schema": SCHEMA
    }
    
    try:
        response = requests.post("https://api.firecrawl.dev/v1/extract", headers=headers, json=payload, timeout=60)
        data = response.json()
        if not data.get("success"):
             print(f"❌ Failed {url}: {data}")
             return sup["id"], None
             
        job_id = data.get("id")
        if not job_id:
             print(f"❌ Failed to get Job ID for {url}: {data}")
             return sup["id"], None
             
        print(f"Started job {job_id} for {url}. Polling for completion...")
        
        while True:
            time.sleep(5)
            poll_resp = requests.get(f"https://api.firecrawl.dev/v1/extract/{job_id}", headers=headers, timeout=60)
            poll_data = poll_resp.json()
            
            status = poll_data.get("status")
            if status == "completed":
                print(f"✅ Success: {url}")
                return sup["id"], poll_data.get("data")
            elif status in ["failed", "error"]:
                print(f"❌ Failed {url} during polling: {poll_data}")
                return sup["id"], None
            elif status != "processing":
                print(f"⚠️ Unknown status {status} for {url}")
                return sup["id"], None
                
    except Exception as e:
        print(f"❌ Exception {url}: {e}")
    return sup["id"], None

def main():
    if not API_KEY:
        print("No API KEY found.")
        return

    with open(INPUT_JSON, "r", encoding="utf-8") as f:
        suppliers = json.load(f)

    # Find 10 suppliers with valid URLs
    targets = []
    for s in suppliers:
        if s.get("url") and "http" in s.get("url") and "adept" not in s.get("url"):
            targets.append(s)
            if len(targets) >= 10:
                break
                
    print(f"Running test extraction on {len(targets)} suppliers...")
    
    results = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_map = {executor.submit(extract_one, s): s for s in targets}
        for future in as_completed(future_map):
            s = future_map[future]
            sup_id, extracted = future.result()
            
            merged = s.copy()
            if extracted:
                for k, v in extracted.items():
                    if v:
                        merged[k] = v
                        
            results.append(merged)
            
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
        
    print(f"Saved test output to {OUTPUT_JSON}")

if __name__ == "__main__":
    main()
