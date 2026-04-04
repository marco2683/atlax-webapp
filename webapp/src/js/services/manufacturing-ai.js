/**
 * Atlas DT Manufacturing AI — Gemini-Powered Product Technology Hierarchy
 *
 * Calls the Gemini 1.5 Flash API with a highly engineered manufacturing
 * prompt to generate a product-specific technology hierarchy in the exact
 * JSON schema consumed by the org-chart renderer.
 *
 * JSON output schema:
 * {
 *   product: string,
 *   category: string,
 *   cm: { title, icon, specialty, focus, certifications[], risks[], description },
 *   tier1: [{ id, title, icon, description, risks[], color, tier2: [{ title, icon, risks[], type }] }]
 * }
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/* Model fallback chain — tries each in order until one succeeds */
const MODEL_CHAIN = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-001'];

function geminiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
}

/* ── SYSTEM PROMPT ─────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are a senior manufacturing engineer and supply chain expert with 20+ years of experience in hardware product development, contract manufacturing, and global sourcing across Asia, Europe, and North America.

Your task is to analyse a product and return a structured JSON object describing the manufacturing technology hierarchy needed to produce it.

CRITICAL RULES:
1. Be product-specific. A "hat" needs cut-and-sew, blocking presses, and knitting — NOT electronics SMT. A "drone" needs PCBA, BLDC motors, and carbon composites. Never use generic templates.
2. Output ONLY valid JSON, no markdown, no code fences, no commentary.
3. Include 3–7 Tier 1 technologies depending on product complexity. Simple products (hat, bag) = 3–4. Complex products (drone, robot) = 5–7.
4. Each Tier 1 node must have 2–3 Tier 2 sub-processes or sub-technologies.
5. Use emoji icons for each node — pick ones that clearly represent the technology.
6. For the "color" field in tier1 nodes, cycle through: "electric", "violet", "amber", "emerald", "coral".
7. Use precise, technical language — name the actual machines, materials, and processes (e.g., "CNC laser cutter", "pneumatic steam-blocker", "5-axis milling centre", not generic "manufacturing equipment").
8. For "type" in tier2, use one of: "Process", "OEM", "Supplier", "Spec".
9. Certifications should be real and relevant to the product category (ISO, CE, FDA, OEKO-TEX, EN 71, etc.).
10. The "cots" array in each tier1 node must list 3–5 real, commercially available off-the-shelf parts, materials, or consumables that are specific to THAT technology for THIS product. Never use generic items like "PCB Sub-assembly" for a hat. Example for a hat's "Sewing" tier: ["Gütermann Polyester Thread", "YKK Brass #5 Zipper", "Prym Press-Studs", "Woven Labels"].

OUTPUT FORMAT (strict JSON, no other text):
{
  "product": "<exact product name as given>",
  "category": "<short category slug, e.g. cut_sew_apparel>",
  "cm": {
    "title": "<contract manufacturer title>",
    "icon": "🏭",
    "specialty": "<1 line specialty>",
    "focus": "<market focus>",
    "certifications": ["<cert1>", "<cert2>", "<cert3>"],
    "risks": ["<key risk 1>", "<key risk 2>", "<key risk 3>", "<key risk 4>"],
    "description": "<2–3 sentence description of this contract manufacturer type>"
  },
  "tier1": [
    {
      "id": "<slug_id>",
      "title": "<technology title>",
      "icon": "<emoji>",
      "description": "<1–2 sentence description of this technology's role>",
      "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
      "color": "electric",
      "tier2": [
        {
          "title": "<sub-process or sub-technology name>",
          "icon": "<emoji>",
          "risks": ["<specific technical risk>"],
          "type": "Process"
        }
      ],
      "cots": ["<off-the-shelf part 1 specific to THIS technology>", "<part 2>", "<part 3>", "<part 4>"]
    }
  ]
}`;

/* ── COLOUR CYCLE ──────────────────────────────────────────── */
const COLOR_CYCLE = ['electric', 'violet', 'amber', 'emerald', 'coral'];

/* ── Helper: delay ─────────────────────────────────────────── */
const delay = ms => new Promise(r => setTimeout(r, ms));

/* ── Try a single model/request ────────────────────────────── */
async function tryModel(model, body) {
  const url = geminiUrl(model);
  console.log(`[ManufacturingAI] Trying model: ${model}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 429) {
    console.warn(`[ManufacturingAI] 429 rate-limited on ${model}`);
    return { rateLimited: true };
  }
  if (!res.ok) {
    const errText = await res.text();
    console.warn(`[ManufacturingAI] ${model} returned ${res.status}:`, errText);
    return { error: true };
  }
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return { error: true };
  return { ok: true, raw, model };
}

/* ── MAIN API CALL ─────────────────────────────────────────── */
export async function generateProductHierarchy(productName) {
  // If no API key configured, fall back gracefully
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_key_here') {
    console.warn('[ManufacturingAI] No Gemini API key — using fallback');
    return getFallbackHierarchy(productName);
  }

  const userPrompt = `Generate the manufacturing technology hierarchy for: "${productName}"

Remember: be product-specific. Analyse what "${productName}" actually IS and what processes are genuinely needed to make it. Do not use a generic template.`;

  const requestBody = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.4,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  };

  try {
    let result;

    // Try each model in the chain
    for (const model of MODEL_CHAIN) {
      result = await tryModel(model, requestBody);
      if (result.ok) break;
      if (result.rateLimited) {
        // Wait 3s then try next model
        console.log(`[ManufacturingAI] Waiting 3s before trying next model…`);
        await delay(3000);
      }
    }

    // If all models were rate-limited, do one final retry on 2.5-flash after a longer wait
    if (!result?.ok) {
      console.log('[ManufacturingAI] All models exhausted. Retrying gemini-2.5-flash after 5s…');
      await delay(5000);
      result = await tryModel('gemini-2.5-flash', requestBody);
    }

    if (!result?.ok) {
      console.error('[ManufacturingAI] All models failed.');
      return getFallbackHierarchy(productName);
    }

    console.log(`[ManufacturingAI] ✓ Success with ${result.model}`);

    // Strip any accidental markdown wrapping
    const clean = result.raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(clean);

    // Ensure colors are set (cycle if missing)
    parsed.tier1 = parsed.tier1.map((t, i) => ({
      ...t,
      color: t.color || COLOR_CYCLE[i % COLOR_CYCLE.length],
    }));

    parsed.generatedAt = new Date().toISOString();
    return parsed;

  } catch (err) {
    console.error('[ManufacturingAI] Parse/fetch error:', err);
    return getFallbackHierarchy(productName);
  }
}

/* ── FALLBACK (when no API key) ────────────────────────────── */
function getFallbackHierarchy(productName) {
  return {
    product: productName,
    category: 'generic',
    generatedAt: new Date().toISOString(),
    cm: {
      title: 'Contract Manufacturer',
      icon: '🏭',
      specialty: 'Full-service hardware manufacturing',
      focus: 'Consumer & Industrial Products',
      certifications: ['ISO 9001', 'RoHS', 'REACH'],
      risks: [
        'Add a Gemini API key to unlock AI-generated hierarchies',
        'Set VITE_GEMINI_API_KEY in your .env file',
        'Get a free key at aistudio.google.com',
      ],
      description: `AI hierarchy generation requires a Gemini API key. Add VITE_GEMINI_API_KEY to your .env file to enable real manufacturing intelligence for "${productName}".`,
    },
    tier1: [
      {
        id: 'api_key',
        title: '🔑 Add Gemini API Key',
        icon: '🔑',
        description: 'Set VITE_GEMINI_API_KEY in your .env file to get AI-generated manufacturing hierarchies.',
        risks: ['Visit aistudio.google.com', 'Create a free API key', 'Add to .env as VITE_GEMINI_API_KEY=...'],
        color: 'amber',
        tier2: [
          { title: 'aistudio.google.com', icon: '🌐', risks: ['Free tier available'], type: 'Supplier' },
          { title: 'VITE_GEMINI_API_KEY=...', icon: '⚙️', risks: ['Add to .env file'], type: 'Spec' },
        ],
      },
    ],
  };
}

