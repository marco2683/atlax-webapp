import os
import json
import logging
import requests
from dotenv import load_dotenv

load_dotenv()
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

class FirecrawlSourcingEngine:
    """
    Leverages Firecrawl Search & Extract to explore the open web for suppliers
    matching specific manufacturing technologies and regions. Useful for compiling
    initial discovery lists when users don't yet have an Alibaba link or license.
    """
    
    def __init__(self):
        self.api_key = FIRECRAWL_API_KEY
        self.base_url = "https://api.firecrawl.dev/v1"

    def search_suppliers(self, technology: str, region: str, specific_requirements: str = "") -> str:
        """
        Uses Firecrawl to search Google and extract structured data about potential suppliers.
        """
        logging.info(f"Initiating Firecrawl web discovery for {technology} in {region}...")
        
        query = f'"{technology}" manufacturer "{region}" "{specific_requirements}"'
        
        # Firecrawl Search API payload
        payload = {
            "query": query,
            "limit": 5, # We want to deep-dive into the top 5 results
            "pageOptions": {
                "fetchPageContent": True,
                "onlyMainContent": True
            },
            "extract": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "company_name": {"type": "string"},
                        "website_url": {"type": "string"},
                        "claimed_capabilities": {"type": "array", "items": {"type": "string"}},
                        "certifications_mentioned": {"type": "array", "items": {"type": "string"}},
                        "contact_email": {"type": "string"},
                        "address": {"type": "string"}
                    },
                    "required": ["company_name", "website_url"]
                }
            }
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        if not self.api_key:
            logging.warning("No FIRECRAWL_API_KEY found in .env. Returning simulated result.")
            return self._mock_firecrawl_response(technology, region)

        try:
            # Note: Firecrawl search + extract can take 10-30 seconds depending on page load
            response = requests.post(f"{self.base_url}/search", json=payload, headers=headers, timeout=60)
            response.raise_for_status()
            data = response.json()
            
            # Format the output for the AI Agent to consume
            results = []
            if "data" in data:
                for item in data["data"]:
                    if "extract" in item:
                        results.append(item["extract"])
                        
            if not results:
                return json.dumps({"status": "no_results", "message": "Firecrawl found no structured data for this query."})
                
            return json.dumps({"status": "success", "suppliers": results}, indent=2)

        except Exception as e:
            logging.error(f"Firecrawl API Error: {str(e)}")
            return json.dumps({"error": str(e)})

    def _mock_firecrawl_response(self, technology: str, region: str) -> str:
        """Simulated response for demonstration."""
        mock = {
            "status": "success (simulated)",
            "suppliers": [
                {
                    "company_name": "Precision Tech Alliance",
                    "website_url": "https://example-precision.com",
                    "claimed_capabilities": [technology, "High Volume Assembly"],
                    "certifications_mentioned": ["ISO9001"],
                    "contact_email": "sales@example-precision.com",
                    "address": f"Industrial Park, {region}"
                },
                 {
                    "company_name": "Apex Manufacturing Ltd",
                    "website_url": "https://example-apex.com",
                    "claimed_capabilities": [technology, "Surface Finishing"],
                    "certifications_mentioned": [],
                    "contact_email": "info@example-apex.com",
                    "address": f"Trade Center, {region}" # Agent should flag this as a potential trader
                }
            ]
        }
        return json.dumps(mock, indent=2)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Firecrawl Web Discovery for Suppliers")
    parser.add_argument("--tech", type=str, required=True, help="Manufacturing technology (e.g. CNC Machining)")
    parser.add_argument("--region", type=str, required=True, help="Geographical location (e.g. Shenzhen, Vietnam)")
    parser.add_argument("--reqs", type=str, default="", help="Specific requirements (e.g. medical, aerospace, high-mix low-volume)")
    
    args = parser.parse_args()
    engine = FirecrawlSourcingEngine()
    print(engine.search_suppliers(args.tech, args.region, args.reqs))
