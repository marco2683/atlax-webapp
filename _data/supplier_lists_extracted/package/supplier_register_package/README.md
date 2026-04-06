# Supplier Register - Dynamic JSON Package

## 📦 Package Contents

- `index.html` - Main HTML file (open this in your browser)
- `supplier_app.js` - JavaScript application code
- `tier1.json` - TIER 1 suppliers data (266 suppliers)
- `tier2.json` - TIER 2 suppliers data (355 suppliers)  
- `oem.json` - OEM suppliers data (479 suppliers)

**Total: 1,100 suppliers** (European countries, South Africa, Korea, and Japan removed)

## 🚀 How to Use

### Option 1: Local Use
1. Keep all files in the same folder
2. Double-click `index.html` to open in your browser
3. That's it!

### Option 2: Web Server
1. Upload all files to your web server
2. Navigate to the HTML file in your browser
3. The app will automatically load the JSON data

## ✨ Features

- **Dark Theme** - Professional dark UI
- **Sortable Columns** - Click any column header to sort
- **Real-time Search** - Search across names, tags, technologies, countries
- **Filters** - Filter by tech group, country, and segment
- **Segment Pills** - Quick filter by Tier1, Tier2, OEM
- **Supplier Cards** - Click any row for detailed information

## 📊 Data Structure

Each supplier in the JSON files follows this format:

```javascript
{
  id: 'sup-0001',
  name: 'Supplier Name',
  lat: null,  // Latitude (not populated)
  lng: null,  // Longitude (not populated)
  city: '',   // City (not populated)
  country: 'AUSTRALIA',
  phone: '',  // Phone (not populated)
  email: '',  // Email (not populated)
  address: '', // Address (not populated)
  stage: 'manufacturing',
  techGroup: 'ADHESIVES / TAPES / FOAMS',
  url: 'https://example.com',
  technologies: ['Technology 1', 'Technology 2'],
  factoryScore: null,  // Factory score (not populated)
  description: 'Notes about the supplier',
  segment: 'TIER 1',
  tags: ['Tag 1', 'Tag 2'],
  certifications: ['ISO 9001', 'ISO 13485']
}
```

## 🔧 Customization

### Adding More Data
Edit the JSON files and add fields like:
- `lat` / `lng` - For map integration
- `phone` / `email` / `address` - Contact information
- `city` - Specific city
- `factoryScore` - Rating system

### Styling
Edit the `<style>` section in `index.html` to customize colors, fonts, etc.

### Functionality  
Edit `supplier_app.js` to add new features or modify behavior.

## 📝 Notes

- All files must be in the same directory
- Works offline once loaded
- No database or server required
- Data loads from external JSON files (not embedded)
- To update supplier data, just replace the JSON files

## 🔄 Updating Data

1. Edit the source Excel file
2. Re-run the data extraction script
3. Replace the JSON files
4. Refresh the browser

---

Created with filtered data excluding:
- European countries (Bulgaria, Czech Republic, France, Germany, Ireland, Italy, Lithuania, Monaco, Netherlands, Poland, Slovakia, Sweden, Switzerland, UK)
- South Africa, Korea, Japan
