import os
import json
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.errors import ClientError

load_dotenv()

def generate_teardowns():
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not found.")
        return

    client = genai.Client(api_key=api_key)
    output_path = os.path.join(os.path.dirname(__file__), '..', 'webapp', 'src', 'data', 'taxonomy', 'master_teardowns.json')
    
    # Load the taxonomy to grab all names to feed to the LLM to ensure perfect matching
    taxonomy_path = os.path.join(os.path.dirname(__file__), '..', 'webapp', 'src', 'data', 'taxonomy', 'master_taxonomy_enriched.json')
    try:
        with open(taxonomy_path, 'r', encoding='utf-8') as f:
            tax_data = json.load(f)
            tech_names = [t['name'] for t in tax_data.get('technologies', [])]
    except Exception as e:
        print(f"Error loading taxonomy for context: {e}")
        return

    print("Requesting 20 highly detailed hardware teardowns from Gemini...")

    prompt = f"""
    You are an elite industrial designer and manufacturing supply chain expert.
    I need you to reverse-engineer exactly 20 of the world's most iconic and famous physical hardware products.
    
    For each product, break it down into 8 to 15 major physical components, drilling down from the macro structure (chassis) to the micro details (lenses, gaskets, fasteners, surface treatments).
    For each component, you MUST map it to the underlying materials, manufacturing processes, and surface finishes used to create it.
    
    CRITICAL INSTRUCTION:
    You MUST ONLY use technology/material names that exist perfectly in my taxonomy dataset, or as close as humanly possible, so that I can soft-match them in my UI.
    
    Example Products to include: iPhone 15 Pro, Rolex Submariner, Aeron Chair, Tesla Model S Alloy Wheel, DJI Mavic 3 Drone, Dyson V15 Vacuum, Leica M11 Camera.
    
    Return the result strictly as a raw JSON array of objects. Do NOT use markdown code blocks.
    
    Schema:
    [
      {{
        "productName": "Apple iPhone 15 Pro",
        "category": "Consumer Electronics",
        "heroImageKeyword": "iphone 15 pro titanium",
        "components": [
          {{
            "name": "Chassis Band",
            "material": "Titanium alloys",
            "manufacturing": ["CNC Machining", "Extrusion"],
            "finishes": ["PVD Coating", "Sandblasting"]
          }}
        ]
      }}
    ]
    """

    try:
        # We use a large model here to ensure deep hardware knowledge
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite-preview',
            contents=prompt,
        )
        
        response_text = response.text.strip()
        # Clean markdown if present
        if response_text.startswith("```"):
            lines = response_text.split('\n')
            if lines[0].startswith("```"): lines = lines[1:]
            if lines[-1].startswith("```"): lines = lines[:-1]
            response_text = '\n'.join(lines)
            
        data = json.loads(response_text)
        
        # Save payload
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({"teardowns": data}, f, indent=2)
            
        print(f"Successfully generated 20 iconic teardowns and saved to {output_path}")

    except Exception as e:
        print(f"Failed to generate teardowns: {e}")

if __name__ == '__main__':
    generate_teardowns()
