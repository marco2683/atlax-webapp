import os, json, requests

API_KEY = None
if os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as env_f:
        for line in env_f:
            if line.startswith("FIRECRAWL_API_KEY="):
                API_KEY = line.strip().split("=")[1].strip()

url = "http://www.completerubber.com.au/"
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}
payload = {
    "urls": [url],
    "prompt": "Extract company city and country",
    "schema": {
        "type": "object",
        "properties": {
            "city": {"type": "string"},
            "country": {"type": "string"}
        }
    }
}
resp = requests.post("https://api.firecrawl.dev/v1/extract", headers=headers, json=payload)
print(resp.status_code)
print(json.dumps(resp.json(), indent=2))
