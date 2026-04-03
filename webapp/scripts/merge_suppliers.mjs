import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_DIR = path.resolve('c:/Users/sebas/OneDrive/Desktop/DUMP/Antigravity Projects/002_Pearl River Delta PRD');
const WEBAPP_DIR = path.join(WORKSPACE_DIR, 'webapp');
const PACKAGE_DIR = path.join(WORKSPACE_DIR, 'supplier_lists_extracted', 'package', 'supplier_register_package');
const OUT_FILE = path.join(WEBAPP_DIR, 'public', 'cms', 'suppliers.json');

async function loadJson(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`Error reading JSON ${filePath}:`, e);
        return [];
    }
}

async function loadJsData(filePath) {
    try {
        let content = await fs.readFile(filePath, 'utf8');
        // Hacky way to turn the ES Module exports into evaluating JS to get the array
        // Replace 'export const SOME_NAME =' with 'return'
        content = content.replace(/export const \w+\s*=\s*/g, 'return ');
        // Find if there are multiple exports or trailing code and strip it, but in our case they are mostly single exports
        const fn = new Function(content);
        return fn();
    } catch (e) {
        // Fallback or more robust parsing
        console.log("Failed to eval", filePath, "attempting to fix. Error:", e.message);
        return [];
    }
}

async function main() {
    console.log("Loading zip JSONs...");
    const tier1 = await loadJson(path.join(PACKAGE_DIR, 'tier1.json'));
    const tier2 = await loadJson(path.join(PACKAGE_DIR, 'tier2.json'));
    const oem = await loadJson(path.join(PACKAGE_DIR, 'oem.json'));

    const allSuppliers = [...tier1, ...tier2, ...oem];
    
    // Process existing JS files
    const jsDir = path.join(WEBAPP_DIR, 'src', 'js', 'data', 'Suppliers');
    const jsFiles = await fs.readdir(jsDir);
    
    console.log("Loading JS files...");
    let addedCount = 0;
    
    for (const file of jsFiles) {
        if (!file.endsWith('.js')) continue;
        const filePath = path.join(jsDir, file);
        // We will just dynamically import them. We can do this in .mjs.
        try {
            // Need a valid file:// URL for Windows
            const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');
            const module = await import(fileUrl);
            // Get the first exported array
            const key = Object.keys(module)[0];
            const data = module[key];
            if (Array.isArray(data)) {
                for (const item of data) {
                    // Normalize tags and Tags
                    if (item.Tags && !item.tags) {
                        item.tags = item.Tags;
                        delete item.Tags;
                    }
                    if (!item.segment) {
                       item.segment = "TIER 1";
                    }
                    allSuppliers.push(item);
                    addedCount++;
                }
            }
        } catch (e) {
            console.error(`Failed to import ${file}:`, e);
        }
    }

    console.log(`Loaded ${allSuppliers.length} total suppliers (Added ${addedCount} from old UI).`);
    
    // Deduplicate by ID just in case
    const uniqueSuppliersMap = new Map();
    for (const sup of allSuppliers) {
        if (!sup.id) continue;
        uniqueSuppliersMap.set(sup.id.toLowerCase(), sup);
    }
    
    const uniqueSuppliers = Array.from(uniqueSuppliersMap.values());
    console.log(`After deduplication: ${uniqueSuppliers.length} suppliers.`);

    await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
    await fs.writeFile(OUT_FILE, JSON.stringify(uniqueSuppliers, null, 2), 'utf8');
    
    console.log(`Success! Saved to ${OUT_FILE}`);
}

main().catch(console.error);
