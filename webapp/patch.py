import sys
data = open('src/js/admin.js', encoding='utf-8').read()
data = data.replace("import { supabase } from './supabase.js';", "import { supabase } from './supabase.js';\nimport { renderPricingConfigurator } from './admin-pricing.js';")
data = data.replace("if (t === 'website')", "if (t === 'pricing') { pageTitle.textContent = 'Pricing Engine Configurator'; renderPricingConfigurator(contentRouting); }\n        if (t === 'website')")
open('src/js/admin.js', 'w', encoding='utf-8').write(data)
