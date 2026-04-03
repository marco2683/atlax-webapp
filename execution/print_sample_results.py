import json

with open('webapp/public/cms/test_enriched_sample.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for s in data:
    name = s.get('name')
    imgs = s.get('images', {})
    banner = 'Yes' if imgs.get('banner') else 'No'
    products = len(imgs.get('product', []))
    facility = len(imgs.get('facility', []))
    equipment = len(imgs.get('equipment', []))
    
    # Also check tags and technologies if any
    techs = len(s.get('technologies', []))
    
    print(f"{name}:")
    print(f"  - Banner: {banner}")
    print(f"  - Product Images: {products}")
    print(f"  - Facility Images: {facility}")
    print(f"  - Equipment Images: {equipment}")
    if products > 0:
        print(f"  - Ex. Product URL: {imgs.get('product')[0]}")
    print(f"  - Technologies Parsed: {techs}")
    print()
