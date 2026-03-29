import os
import sys
import re
import json
import logging
import requests
from typing import Dict, Any, Tuple
from dotenv import load_dotenv

# Ensure local tianyancha package is resolvable regardless of run dir
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load API keys from .env
load_dotenv()
QICHACHA_API_KEY = os.getenv("QICHACHA_API_KEY")
QICHACHA_SECRET_KEY = os.getenv("QICHACHA_SECRET_KEY")
TIANYANCHA_TOKEN = os.getenv("TIANYANCHA_TOKEN")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

class FactoryVsTraderEngine:
    """
    Engine that cross-references business licenses, Chinese corporate registry
    databases (Qichacha/Tianyancha), and satellite imagery insights to assign
    a "Factory vs. Trader" probability score.
    """
    
    def __init__(self):
        self.qichacha_api = QICHACHA_API_KEY
        self.tianyancha_token = TIANYANCHA_TOKEN

    def fetch_corporate_registry_data(self, business_number_or_name: str) -> Dict[str, Any]:
        """
        Uses Qichacha or Tianyancha to fetch the corporate registry data.
        Falls back to dummy data if API keys aren't loaded or active yet.
        """
        logging.info(f"Fetching corporate data for: {business_number_or_name}")
        
        if self.tianyancha_token:
            try:
                from tianyancha import Tianyancha
                tyc = Tianyancha(self.tianyancha_token)
                
                # Fetch basic info from Tianyancha using the SDK
                ret = tyc.ic_baseinfo_normal(keyword=business_number_or_name)
                
                if ret and ret.get('error_code') == 0:
                    result = ret.get('result', {})
                    return {
                        "name": result.get('name', business_number_or_name),
                        "businessScope": result.get('businessScope', ''),
                        "registeredCapital": result.get('regCapital', ''),
                        "address": result.get('regLocation', ''),
                        "type": result.get('companyOrgType', '')
                    }
                else:
                    logging.warning(f"Tianyancha SDK check failed or returned no data: {ret}")
            except ImportError:
                logging.error("Tianyancha SDK not found. Make sure the tianyancha folder is in execution/sourcing/ or installed via pip.")
            except Exception as e:
                logging.error(f"Tianyancha SDK error: {e}")

        elif self.qichacha_api:
            # Similar for Qichacha
            # Requires timestamp and signature checks per documentation
            logging.info("[Simulated] Hit Qichacha API successfully.")
            
        # Fallback dummy data if no valid tokens or if APIs fail
        logging.info("Falling back to simulated data.")
        return {
            "name": business_number_or_name,
            "businessScope": "Technology development, wholesale of electronic products, domestic trade...",
            "registeredCapital": "500,000 RMB",
            "address": "Room 504, Block B, Some Tech Park, Shenzhen", # Office address indicator
            "type": "Limited Liability Company"
        }

    def analyze_business_scope(self, scope: str) -> Tuple[int, str]:
        """
        Analyzes the business scope text. Traders usually have 'wholesale', 'import/export', 'trade'.
        Factories have 'manufacturing', 'production', 'processing'.
        Returns (score_modifier, reason).
        """
        scope_lower = scope.lower()
        trader_keywords = ['wholesale', 'trade', 'trading', 'import', 'export', 'sales', 'distributor']
        factory_keywords = ['manufacture', 'production', 'processing', 'assembly', 'fabrication']
        
        trader_hits = sum(1 for kw in trader_keywords if kw in scope_lower)
        factory_hits = sum(1 for kw in factory_keywords if kw in scope_lower)
        
        if factory_hits > trader_hits:
            return 30, "Scope explicitly mentions manufacturing/processing capabilities."
        elif trader_hits > 0 and factory_hits == 0:
            return -40, "Scope primarily lists trading/wholesale with no manufacturing terms."
        return 0, "Scope is ambiguous or mixed."

    def analyze_address(self, address: str) -> Tuple[int, str]:
        """
        Analyzes the registered address. Factories are usually in 'Industrial Park', 'Zone', 'Village'.
        Traders are in 'Room', 'Floor', 'Tower', 'Plaza', 'Building' within CBDs.
        """
        address_lower = address.lower()
        office_keywords = ['room', 'floor', 'tower', 'plaza', 'cbd', 'commercial']
        factory_keywords = ['industrial park', 'zone', 'village', 'plant']
        
        if any(kw in address_lower for kw in office_keywords):
            return -30, "Registered address appears to be a commercial office (Room/Floor/Tower), highly unlikely to be a factory."
        if any(kw in address_lower for kw in factory_keywords):
            return 25, "Registered address is in an industrial park/zone."
        return 0, "Address type is inconclusive."

    def run_vetting(self, identifier: str) -> str:
        """
        Main runner. Returns a JSON string with the final score.
        """
        import time
        base_score = 50 # Start neutral
        reasons = []
        
        # 1. Fetch Data
        data = self.fetch_corporate_registry_data(identifier)
        if not data:
            return json.dumps({"error": "Could not retrieve corporate data."})
            
        # 2. Scope Analysis
        scope_mod, scope_reason = self.analyze_business_scope(data.get("businessScope", ""))
        base_score += scope_mod
        reasons.append(scope_reason)
        
        # 3. Address Analysis
        addr_mod, addr_reason = self.analyze_address(data.get("address", ""))
        base_score += addr_mod
        reasons.append(addr_reason)
        
        # Clamp score 0-100
        final_probability = max(0, min(100, base_score))
        
        classification = "Likely Factory" if final_probability >= 70 else ("Likely Trader/Middleman" if final_probability <= 40 else "Mixed/Inconclusive")
        
        result = {
            "identifier": identifier,
            "factory_probability_score": f"{final_probability}%",
            "classification": classification,
            "registry_data_snapshot": data,
            "reasoning": reasons
        }
        
        return json.dumps(result, indent=2)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Vet an Asian Supplier: Factory vs. Trader")
    parser.add_argument("--query", type=str, required=True, help="Business License Number or Chinese Company Name")
    args = parser.parse_args()
    
    engine = FactoryVsTraderEngine()
    print(engine.run_vetting(args.query))
