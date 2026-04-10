import os
import json
import time
from google import genai
from dotenv import load_dotenv

def enrich_taxonomy():
    """
    Reads master_taxonomy.json and uses the Gemini API to enrich each 
    technology with real manufacturing intelligence.
    """
    # Load environment variables
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("Error: Please add GEMINI_API_KEY to your .env file.")
        return
        
    client = genai.Client(api_key=api_key)

    input_path = os.path.join(os.path.dirname(__file__), '..', 'webapp', 'src', 'data', 'taxonomy', 'master_taxonomy.json')
    output_path = os.path.join(os.path.dirname(__file__), '..', 'webapp', 'src', 'data', 'taxonomy', 'master_taxonomy_enriched.json')
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return
        
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    technologies = data.get("technologies", [])
    print(f"Loaded {len(technologies)} items to enrich.")
    
    try:
        for i, item in enumerate(technologies):
            # Skip if already enriched (in case script was stopped and restarted)
            if not item.get("description", "").startswith("Detailed description for"):
                print(f"Skipping {item['name']}, already seems enriched.")
                continue

            print(f"[{i+1}/{len(technologies)}] Enriching: {item['name']} ({item['category']})")
            
            prompt = f"""
            You are a master manufacturing engineer. I am building a hardware manufacturing taxonomy.
            Provide detailed intelligence for the sub-technology '{item['name']}' which belongs to '{item['category']}'.
            
            Return ONLY a valid JSON object with the following exact structure, with no markdown code blocks around it:
            {{
                "description": "A single long paragraph explaining what this sub-technology is and how it works mechanically/physically.",
                "whyUtilized": "A few sentences on why someone would choose this over other methods.",
                "keyAchievement": "The main technical achievement or capability of this technology.",
                "intricacies": "What makes this process difficult? (e.g., tooling costs, cycle times, programming, strict specific requirements).",
                "wayToGoAboutIt": "How a hardware team actually executes this (do they need molds? special CAD? outside vendors?).",
                "exampleProducts": ["Example product 1", "Example product 2"]
            }}
            """
            
            max_retries = 10
            for attempt in range(max_retries):
                try:
                    # Switch to gemini-3.1-flash-lite-preview to bypass 404s and 503s on overloaded older endpoints
                    response = client.models.generate_content(
                        model='gemini-3.1-flash-lite-preview',
                        contents=prompt
                    )
                    response_text = response.text.strip()
                    
                    # Strip markdown json block if model accidentally included it
                    if response_text.startswith("```json"):
                        response_text = response_text[7:]
                    if response_text.startswith("```"):
                        response_text = response_text[3:]
                    if response_text.endswith("```"):
                        response_text = response_text[:-3]
                        
                    enriched_data = json.loads(response_text.strip())
                    
                    # Apply data back to the item
                    item['description'] = enriched_data.get('description', item['description'])
                    item['whyUtilized'] = enriched_data.get('whyUtilized', item['whyUtilized'])
                    item['keyAchievement'] = enriched_data.get('keyAchievement', item['keyAchievement'])
                    item['intricacies'] = enriched_data.get('intricacies', item['intricacies'])
                    item['wayToGoAboutIt'] = enriched_data.get('wayToGoAboutIt', item['wayToGoAboutIt'])
                    item['exampleProducts'] = enriched_data.get('exampleProducts', item['exampleProducts'])
                    
                    break # Success, break out of retry loop
                    
                except Exception as e:
                    print(f"Error on attempt {attempt+1}: {e}")
                    if attempt < max_retries - 1:
                        sleep_time = (attempt + 1) * 10
                        print(f"Retrying in {sleep_time} seconds (Could be Free Tier 15 RPM limits)...")
                        time.sleep(sleep_time)
                    else:
                        print(f"Failed to enrich {item['name']} after {max_retries} attempts.")
                        # Reraise so outer block can handle failure and stop process if needed
                        raise e
                
            # Sleep 4.5 seconds to strictly enforce exactly ~13 Requests Per Minute, safely under the 15 RPM Free Tier Limit
            time.sleep(4.5)
            
            # Save incrementally every 10 items in case it crashes
            if i % 10 == 0:
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2)
                    
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Saving progress...")
        
    # Final save
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
        
    print(f"Enriched taxonomy saved to {output_path}")

if __name__ == '__main__':
    enrich_taxonomy()
