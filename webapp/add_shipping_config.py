import json
import os

filepath = r'c:\Users\sebas\OneDrive\Desktop\DUMP\Antigravity Projects\002_Pearl River Delta PRD\webapp\src\js\data\pricing-config.json'

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

if 'shipping' not in data['globalSettings']:
    data['globalSettings']['shipping'] = {
        "regions": {
            "north_america": {
              "label": "North America",
              "seaFreight": { "base": 20, "perKg": 3, "days": "30-40" },
              "economyAir": { "base": 30, "perKg": 8, "days": "8-12" },
              "expressAir": { "base": 40, "perKg": 15, "days": "3-5" }
            },
            "europe": {
              "label": "Europe",
              "seaFreight": { "base": 25, "perKg": 3.5, "days": "35-45" },
              "economyAir": { "base": 35, "perKg": 9, "days": "10-14" },
              "expressAir": { "base": 45, "perKg": 16, "days": "4-6" }
            },
            "oceania": {
              "label": "Oceania",
              "seaFreight": { "base": 20, "perKg": 3.5, "days": "25-35" },
              "economyAir": { "base": 35, "perKg": 8.5, "days": "8-12" },
              "expressAir": { "base": 45, "perKg": 15, "days": "4-6" }
            },
            "asia": {
              "label": "Asia",
              "seaFreight": { "base": 15, "perKg": 2, "days": "10-15" },
              "economyAir": { "base": 20, "perKg": 5, "days": "3-5" },
              "expressAir": { "base": 30, "perKg": 10, "days": "1-3" }
            },
            "rest_of_world": {
              "label": "Rest of World",
              "seaFreight": { "base": 30, "perKg": 4, "days": "40-50" },
              "economyAir": { "base": 40, "perKg": 12, "days": "12-16" },
              "expressAir": { "base": 50, "perKg": 20, "days": "5-8" }
            }
        }
    }

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("SUCCESS")
