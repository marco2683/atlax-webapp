const GENERATION_SYSTEM_PROMPT = `
You are the Atlas Solutions Architect, operating as the most elite hardware engineering consultant in the world.
The user wants to formulate a product architecture. They have provided you with:
1. Product Concept (What they want to build)
2. Aesthetic Style

Your task is to provide a MASSIVELY comprehensive, natively flowing intelligence report (a deep teardown of the product's engineering realities). Do NOT artificially compress your thoughts. Speak extensively about product strategy, precise materials, tooling, surface finishes, assembly flows, QC, exact failure modes, COGS tradeoffs, and especially HIGH-RISK execution blindspots. Provide sharp, opinionated direction.

You must output a highly structured JSON object containing exactly TWO top-level keys:
1. "matrixNodes": Exactly 4 arrays used to build a visual UI graph. Keep these strictly 1-sentence tags.
2. "comprehensive_report_html": A massive string of raw, beautifully formatted HTML text. 

CRITICAL RULE: Return ONLY valid JSON.
CRITICAL RULE 2: In your "comprehensive_report_html", DO NOT USE MARKDOWN (no \`##\` or \`**\`). Use PURE HTML. Use <h2>, <h3>, <p>, <ul>, <li>, and <strong> tags to structure the document so it reads like a premium, cohesive Substack article.

JSON STRUCTURE:
{
  "matrixNodes": {
    "talents": [{"label": "Role", "type": "talent", "description": "1 sentence"}],
    "technologies": [{"label": "Material", "type": "tech", "description": "1 sentence"}],
    "processes": [{"label": "Process", "type": "process", "description": "1 sentence"}],
    "logistics": [{"label": "Compliance", "type": "logistics", "description": "1 sentence"}]
  },
  "comprehensive_report_html": "<h2>Executive Teardown</h2><p>Your cohesive, long-form narrative here...</p><h2>Key Risks & Failure Modes</h2><ul><li>...</li></ul>..."
}
`;

export async function generateProductMatrix(formData) {
  try {
    const key = import.meta.env.VITE_OPENAI_API_KEY;
    if (!key) {
      console.warn('No OpenAI key, using fallback matrix.');
      return getFallbackMatrix();
    }

    const payload = [{
      role: 'user', 
      content: `
Product: ${formData.product}
Style: ${formData.styleKeyword}
      `.trim()
    }];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: GENERATION_SYSTEM_PROMPT },
          ...payload
        ],
        temperature: 0.8,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI Error:", err);
      throw new Error(`API Failure: ${err}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    if (content.startsWith("\`\`\`json")) {
      content = content.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    } else if (content.startsWith("\`\`\`")) {
      content = content.replace(/\`\`\`/g, "").trim();
    }

    const matrix = JSON.parse(content);
    return matrix;

  } catch (err) {
    console.error("Matrix gen failed", err);
    return getFallbackMatrix(err.message || String(err));
  }
}

function getFallbackMatrix(errMsg = "No error message provided") {
  return {
    "matrixNodes": {
      "talents": [
        { "label": "Industrial Designer", "type": "talent", "description": "Defines form and UX." }
      ],
      "technologies": [
        { "label": "Aerospace Aluminum", "type": "tech", "description": "Core body structure." }
      ],
      "processes": [
        { "label": "5-Axis CNC", "type": "process", "description": "Milling metal casing." }
      ],
      "logistics": [
        { "label": "DFA Analysis", "type": "logistics", "description": "Design for assembly." }
      ]
    },
    "comprehensive_report_html": `
      <h2>API Error Detected</h2>
      <p>This is a fallback placeholder due to an API failure.</p>
      <p style="color:#ff6b6b; font-family:monospace; padding:15px; background:rgba(255,0,0,0.1); border-left:3px solid #ff6b6b;">Error Details:<br/>${errMsg}</p>
      <h3>Next Steps</h3>
      <ul>
        <li>Ensure your billing constraints are satisfied on OpenAI.</li>
        <li>Check your network connection.</li>
      </ul>
    `
  };
}
