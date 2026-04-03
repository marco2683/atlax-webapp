import json
import os
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

# Manually load env variables to get FIRECRAWL_API_KEY
API_KEY = None
if os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as env_f:
        for line in env_f:
            if line.startswith("FIRECRAWL_API_KEY="):
                API_KEY = line.strip().split("=")[1].strip()

if not API_KEY:
    raise ValueError("FIRECRAWL_API_KEY not found in .env file.")

# Paths
INPUT_JSON = os.path.join("webapp", "public", "cms", "suppliers.json")
OUTPUT_JSON = os.path.join(".tmp", "scraped_suppliers_temp.json")
FINAL_JSON = os.path.join("webapp", "public", "cms", "suppliers_enriched.json")

# Ensure .tmp exists
os.makedirs(".tmp", exist_ok=True)

SCHEMA = {
  "type": "object",
  "properties": {
    "group": { "type": "string" },
    "companyType": { "type": "string" },
    "city": { "type": "string" },
    "country": { "type": "string" },
    "description": { "type": "string" },
    "email": { "type": "string" },
    "phone": { "type": "string" },
    "wechat": { "type": "string" },
    "responseTime": { "type": "string" },
    "factoryScore": { "type": "number" },
    "exportCountries": { "type": "number" },
    "yearEstablished": { "type": "string" },
    "employees": { "type": "string" },
    "factoryArea": { "type": "string" },
    "moq": { "type": "string" },
    "leadTime": { "type": "string" },
    "technologies": { "type": "array", "items": { "type": "string" } },
    "tags": { "type": "array", "items": { "type": "string" } },
    "certifications": { "type": "array", "items": { "type": "string" } },
    "images": {
      "type": "object",
      "properties": {
        "banner": { "type": "string" },
        "product": { "type": "array", "items": { "type": "string" } },
        "facility": { "type": "array", "items": { "type": "string" } },
        "equipment": { "type": "array", "items": { "type": "string" } }
      }
    },
    "videoWalkthrough": { "type": "string" },
    "documents": { "type": "array", "items": { "type": "string" } }
  }
}

PROMPT = """
You are analyzing a supplier's website. Please extract the company profile information according to the strict schema.
Interpret the data carefully, especially when parsing tags and information about their specific technologies (e.g. 5-Axis CNC Milling, Injection Molding, etc). 
If specific fields like wechat, MOQ, response time, or exact factory area are missing, return null or empty for those fields, but try to find them on About Us or Contact pages.
Crucially, extract fully qualified absolute image URLs (starting with http/https) for the company's banner, products, facilities, and equipment. Only extract valid real image URLs found on the page.
"""

def extract_supplier_data(url):
    print(f"[{time.strftime('%H:%M:%S')}] Starting extraction for: {url}")
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "urls": [url],
        "prompt": PROMPT,
        "schema": SCHEMA
    }

    retries = 3
    for attempt in range(retries):
        try:
            response = requests.post("https://api.firecrawl.dev/v1/extract", headers=headers, json=payload, timeout=60)
            data = response.json()
            if not data.get("success"):
                 print(f"[{time.strftime('%H:%M:%S')}] Failed {url}: {data}")
                 if response.status_code == 429:
                     time.sleep(30)
                     continue
                 return None
                 
            job_id = data.get("id")
            if not job_id:
                 print(f"[{time.strftime('%H:%M:%S')}] Failed to get Job ID for {url}: {data}")
                 return None
                 
            while True:
                time.sleep(5)
                poll_resp = requests.get(f"https://api.firecrawl.dev/v1/extract/{job_id}", headers=headers, timeout=60)
                poll_data = poll_resp.json()
                
                status = poll_data.get("status")
                if status == "completed":
                    print(f"[{time.strftime('%H:%M:%S')}] ✅ Success for: {url}")
                    return poll_data.get("data")
                elif status in ["failed", "error"]:
                    print(f"[{time.strftime('%H:%M:%S')}] ❌ Failed {url} during polling: {poll_data}")
                    return None
                elif status != "processing":
                    print(f"[{time.strftime('%H:%M:%S')}] ⚠️ Unknown status {status} for {url}")
                    return None

        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] Exception for {url}: {e}")
            time.sleep(5)
            
    return None

def main():
    with open(INPUT_JSON, "r", encoding="utf-8") as f:
        suppliers = json.load(f)

    # Dictionary to keep track of completed output
    # Key: supplier id, Value: mapped supplier object
    completed_suppliers = {}
    
    # Load past progress if exists
    if os.path.exists(OUTPUT_JSON):
        try:
            with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
                past_list = json.load(f)
                for item in past_list:
                    if "id" in item:
                        completed_suppliers[item["id"]] = item
            print(f"Loaded {len(completed_suppliers)} previously completed suppliers.")
        except Exception as e:
            print("Could not load past progress:", e)

    def get_priority(country):
        if not country: return 4
        c = country.strip().upper()
        if c in ["CHINA", "CN"]: return 1
        asian = ["TAIWAN", "JAPAN", "SOUTH KOREA", "KOREA", "VIETNAM", "INDIA", "MALAYSIA", "THAILAND", "SINGAPORE", "INDONESIA", "PHILIPPINES"]
        if c in asian: return 2
        if c in ["USA", "UNITED STATES", "US"]: return 3
        return 4

    # Sort suppliers by priority
    suppliers.sort(key=lambda s: get_priority(s.get("country", "")))

    # Prepare jobs
    jobs = []
    
    for idx, sup in enumerate(suppliers):
        sup_id = sup.get("id", f"unknown-{idx}")
        # Make sure supplier has ID
        sup["id"] = sup_id
        
        # Check if already processed
        if sup_id in completed_suppliers:
            continue
            
        url = sup.get("url")
        if not url:
            # No URL, just re-format to match output template by default without extraction
            pass
        else:
            if not url.startswith("http"):
                url = "https://" + url

        jobs.append((sup_id, sup, url))

    print(f"Total suppliers left to process: {len(jobs)}")

    # Limit to just 5 items for the initial test. 
    # USER NOTE: During automated test, we will just run the first 5 to verify it works reliably.
    # To run all, comment out this list trimming.
    is_test_run = False
    if is_test_run:
        print("TEST RUN ENABLED: Only running the first 5 suppliers to verify functionality.")
        jobs = jobs[:5]

    try:
        # Use ThreadPoolExecutor to run concurrently
        # 5 workers max to play nice with rate limits
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_job = {}
            for job in jobs:
                sup_id, sup, url = job
                
                # If no url, dummy future
                if not url:
                    future = executor.submit(lambda: None)
                else:
                    future = executor.submit(extract_supplier_data, url)
                
                future_to_job[future] = job

            for future in as_completed(future_to_job):
                sup_id, sup, url = future_to_job[future]
                extracted_data = future.result()

                # Merge extracted data into original supplier data using provided template prioritize schema format
                merged = {
                    "id": sup.get("id"),
                    "name": sup.get("name") or "",
                    "group": sup.get("group") or "",
                    "techGroup": sup.get("techGroup") or (sup.get("technologies")[0] if sup.get("technologies") else ""),
                    "companyType": "",
                    "city": sup.get("city") or "",
                    "country": sup.get("country") or "",
                    "lat": sup.get("lat"),
                    "lng": sup.get("lng"),
                    "description": sup.get("description") or "",
                    "url": sup.get("url") or "",
                    "email": sup.get("email") or "",
                    "phone": sup.get("phone") or "",
                    "wechat": "",
                    "responseTime": "",
                    "factoryScore": sup.get("factoryScore"),
                    "exportCountries": 0,
                    "yearEstablished": "",
                    "employees": "",
                    "factoryArea": "",
                    "moq": "",
                    "leadTime": "",
                    "technologies": sup.get("technologies") or [],
                    "tags": sup.get("tags") or [],
                    "certifications": sup.get("certifications") or [],
                    "images": sup.get("images") or {"banner": "", "product": [], "facility": [], "equipment": []},
                    "videoWalkthrough": sup.get("videoWalkthrough") or "",
                    "documents": sup.get("documents") or []
                }
                
                if extracted_data:
                    # Update fields where extraction found something new
                    for key in merged.keys():
                        if key in extracted_data and extracted_data[key]:
                            # Specially handle arrays and dicts to merge
                            if key in ["tags", "technologies", "certifications"] and isinstance(extracted_data[key], list):
                                # Merge lists and dedup
                                merged[key] = list(set(merged[key] + extracted_data[key]))
                            elif key == "images" and isinstance(extracted_data[key], dict):
                                for img_cat in ["banner", "product", "facility", "equipment"]:
                                    if img_cat in extracted_data[key] and extracted_data[key][img_cat]:
                                        if img_cat == "banner":
                                            merged["images"]["banner"] = extracted_data[key][img_cat]
                                        else:
                                            # array
                                            if img_cat not in merged["images"]:
                                                merged["images"][img_cat] = []
                                            merged["images"][img_cat] = list(set(merged["images"][img_cat] + extracted_data[key][img_cat]))
                            else:
                                merged[key] = extracted_data[key]

                completed_suppliers[sup_id] = merged
                
                # Save progress incrementally
                with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
                    # We output a list of what has been completed so far
                    json.dump(list(completed_suppliers.values()), f, indent=2, ensure_ascii=False)
                    
    except KeyboardInterrupt:
        print("Script interrupted, saved progress.")

    # Write final output (for the test we just merge what we have with the original list)
    print(f"Finished processing. We have {len(completed_suppliers)} processed suppliers.")
    
    # Merge back into final list to keep all 1178 items
    final_list = []
    for sup in suppliers:
        s_id = sup.get("id")
        if s_id in completed_suppliers:
            final_list.append(completed_suppliers[s_id])
        else:
            final_list.append(sup)
            
    with open(FINAL_JSON, "w", encoding="utf-8") as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)
        
    print(f"Saved merged list to {FINAL_JSON}")

if __name__ == "__main__":
    main()
