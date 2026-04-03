import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'public', 'cms', 'suppliers.json');
let suppliers = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const LOCATION_MAP = {
  // China
  "SHENZHEN": { lat: 22.5431, lng: 114.0579 },
  "DONGGUAN": { lat: 23.0207, lng: 113.7518 },
  "GUANGZHOU": { lat: 23.1291, lng: 113.2644 },
  "ZHONGSHAN": { lat: 22.5173, lng: 113.3928 },
  "FOSHAN": { lat: 23.0215, lng: 113.1214 },
  "HUIZHOU": { lat: 23.1118, lng: 114.4162 },
  "JIANGMEN": { lat: 22.5786, lng: 113.0816 },
  "ZHUHAI": { lat: 22.2707, lng: 113.5767 },
  "ZHAOQING": { lat: 23.0515, lng: 112.4690 },
  "SHANGHAI": { lat: 31.2304, lng: 121.4737 },
  "BEIJING": { lat: 39.9042, lng: 116.4074 },
  "NINGBO": { lat: 29.8683, lng: 121.5440 },
  "SUZHOU": { lat: 31.2989, lng: 120.5853 },
  "HANGZHOU": { lat: 30.2741, lng: 120.1551 },
  // Vietnam
  "HO CHI MINH CITY": { lat: 10.8231, lng: 106.6297 },
  "HANOI": { lat: 21.0285, lng: 105.8542 },
  "HAIPHONG": { lat: 20.8449, lng: 106.6881 },
  "BINH DUONG": { lat: 11.2238, lng: 106.6260 },
  "DONG NAI": { lat: 10.9333, lng: 107.2133 },
  "BAC NINH": { lat: 21.1861, lng: 106.0763 },
  // Thailand
  "BANGKOK": { lat: 13.7563, lng: 100.5018 },
  "CHONBURI": { lat: 13.3611, lng: 100.9847 },
  "AYUTTHAYA": { lat: 14.3505, lng: 100.5684 },
  "RAYONG": { lat: 12.6814, lng: 101.2816 },
  "SAMUT PRAKAN": { lat: 13.5993, lng: 100.5968 },
  // Taiwan
  "TAIPEI": { lat: 25.0330, lng: 121.5654 },
  "KAOHSIUNG": { lat: 22.6273, lng: 120.3014 },
  "TAICHUNG": { lat: 24.1477, lng: 120.6736 },
  "TAINAN": { lat: 22.9997, lng: 120.2270 },
  // India
  "MUMBAI": { lat: 19.0760, lng: 72.8777 },
  "NEW DELHI": { lat: 28.6139, lng: 77.2090 },
  "BANGALORE": { lat: 12.9716, lng: 77.5946 },
  "CHENNAI": { lat: 13.0827, lng: 80.2707 },
  // Japan
  "TOKYO": { lat: 35.6762, lng: 139.6503 },
  "OSAKA": { lat: 34.6937, lng: 135.5023 },
  "NAGOYA": { lat: 35.1815, lng: 136.9066 },
  // Country fallbacks
  "CHINA": { lat: 35.8617, lng: 104.1954 },
  "VIETNAM": { lat: 14.0583, lng: 108.2772 },
  "THAILAND": { lat: 15.8700, lng: 100.9925 },
  "TAIWAN": { lat: 23.6978, lng: 120.9605 },
  "INDIA": { lat: 20.5937, lng: 78.9629 },
  "AUSTRALIA": { lat: -25.2744, lng: 133.7751 },
  "USA": { lat: 37.0902, lng: -95.7129 },
  "FRANCE": { lat: 46.2276, lng: 2.2137 },
  "JAPAN": { lat: 36.2048, lng: 138.2529 }
};

let count = 0;
suppliers.forEach(s => {
  if (s.lat === null || s.lng === null || s.lat === 0 || s.lat === undefined) {
    let coords = null;
    const cityStr = (s.city || '').toUpperCase();
    const ctryStr = (s.country || '').toUpperCase();
    
    // Exact city match
    if (LOCATION_MAP[cityStr]) coords = LOCATION_MAP[cityStr];
    // Exact country match
    else if (LOCATION_MAP[ctryStr]) coords = LOCATION_MAP[ctryStr];
    // Fuzzy city logic
    else {
      // Find matching keys in city string
      for (let k in LOCATION_MAP) {
         if (cityStr.includes(k) || ctryStr.includes(k)) { coords = LOCATION_MAP[k]; break; }
      }
    }
    
    // If we found coords, inject them with slight jitter so they don't exactly overlap
    // Increase jitter significantly so they sprawl in the region
    if (coords) {
      // Big jitter radius (up to 3 degrees ~ 300km)
      const jitterLat = (Math.random() - 0.5) * 3.0;
      const jitterLng = (Math.random() - 0.5) * 3.0;
      s.lat = coords.lat + jitterLat;
      s.lng = coords.lng + jitterLng;
      count++;
    }
  }
});

fs.writeFileSync(dbPath, JSON.stringify(suppliers, null, 2), 'utf8');
console.log(`Updated ${count} suppliers with lat/lng coordinates.`);
