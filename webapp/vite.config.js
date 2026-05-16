import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

function crudPlugin() {
  return {
    name: 'crud-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/api/login') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const filePath = resolve(__dirname, 'public/cms/staff.json');
              let raw = '[]';
              try { raw = await fs.readFile(filePath, 'utf-8'); } catch(e) {}
              const staffMembers = JSON.parse(raw);
              const data = JSON.parse(body);
              const user = staffMembers.find(s => 
                (s.email || '').trim().toLowerCase() === (data.email || '').trim().toLowerCase() && 
                s.password === data.password
              );
              res.setHeader('Content-Type', 'application/json');
              if (user) {
                res.end(JSON.stringify({ success: true, user: { name: user.name, email: user.email, role: user.role } }));
              } else {
                res.statusCode = 401;
                res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
              }
            } catch(e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } else if (req.url.startsWith('/api/staff') && (req.method === 'POST' || req.method === 'DELETE')) {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const filePath = resolve(__dirname, 'public/cms/staff.json');
              let raw = '[]';
              try { raw = await fs.readFile(filePath, 'utf-8'); } catch(e) {}
              let staffMembers = JSON.parse(raw);

              if (req.method === 'POST') {
                const data = JSON.parse(body);
                const idx = staffMembers.findIndex(s => String(s.id) === String(data.id));
                if (idx > -1) {
                  staffMembers[idx] = data; // Update
                } else {
                  if (!data.id) data.id = 'staff-' + Date.now();
                  staffMembers.push(data); // Insert
                }
              } else if (req.method === 'DELETE') {
                const urlObj = new URL(req.url, 'http://' + req.headers.host);
                const idToRemove = urlObj.searchParams.get('id');
                if (idToRemove) {
                  staffMembers = staffMembers.filter(s => String(s.id) !== String(idToRemove));
                }
              }
              
              await fs.writeFile(filePath, JSON.stringify(staffMembers, null, 2));
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch(e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } else if (req.url.startsWith('/api/suppliers') && (req.method === 'POST' || req.method === 'DELETE')) {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const filePath = resolve(__dirname, 'public/cms/suppliers.json');
              const raw = await fs.readFile(filePath, 'utf-8');
              let suppliers = JSON.parse(raw);

              if (req.method === 'POST') {
                const data = JSON.parse(body);
                const idx = suppliers.findIndex(s => String(s.id) === String(data.id));
                if (idx > -1) {
                  suppliers[idx] = data; // Update
                } else {
                  if (!data.id) data.id = 'sup-' + Date.now();
                  suppliers.push(data); // Insert
                }
              } else if (req.method === 'DELETE') {
                const urlObj = new URL(req.url, 'http://' + req.headers.host);
                const idToRemove = urlObj.searchParams.get('id');
                if (idToRemove) {
                  suppliers = suppliers.filter(s => String(s.id) !== String(idToRemove));
                }
              }
              
                await fs.writeFile(filePath, JSON.stringify(suppliers, null, 2));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch(e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
              }
            });
          } else if (req.url.startsWith('/api/platform-access')) {
            if (req.method === 'GET') {
              try {
                const filePath = resolve(__dirname, 'public/cms/platform_access.json');
                let raw = '[]';
                try { raw = await fs.readFile(filePath, 'utf-8'); } catch(e) {}
                res.setHeader('Content-Type', 'application/json');
                res.end(raw);
              } catch(e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
              }
            } else if (req.method === 'POST' || req.method === 'DELETE') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const filePath = resolve(__dirname, 'public/cms/platform_access.json');
                  let raw = '[]';
                  try { raw = await fs.readFile(filePath, 'utf-8'); } catch(e) {}
                  let emails = JSON.parse(raw);
  
                  if (req.method === 'POST') {
                    const data = JSON.parse(body);
                    if (data.email && !emails.includes(data.email.toLowerCase().trim())) {
                      emails.push(data.email.toLowerCase().trim());
                    }
                  } else if (req.method === 'DELETE') {
                    const urlObj = new URL(req.url, 'http://' + req.headers.host);
                    const emailToRemove = urlObj.searchParams.get('email');
                    if (emailToRemove) {
                      emails = emails.filter(e => e !== emailToRemove.toLowerCase().trim());
                    }
                  }
                  
                  await fs.writeFile(filePath, JSON.stringify(emails, null, 2));
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, emails }));
                } catch(e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
            }
          } else if (req.url.startsWith('/.netlify/functions/admin-rfqs')) {
          import('@supabase/supabase-js').then(async ({ createClient }) => {
            const { loadEnv } = await import('vite');
            const env = loadEnv('development', process.cwd(), '');
            const supabaseUrl = env.VITE_SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
            
            if (!supabaseUrl || !supabaseKey) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: "Missing Supabase env vars" }));
              return;
            }

            const supabase = createClient(supabaseUrl, supabaseKey);
            try {
              if (req.method === 'GET') {
                const urlObj = new URL(req.url, 'http://' + req.headers.host);
                const action = urlObj.searchParams.get('action');
                if (action === 'count') {
                  const status = urlObj.searchParams.get('status');
                  const userId = urlObj.searchParams.get('userId');
                  let query = supabase.from('rfq_history').select('id', { count: 'exact', head: true });
                  if (userId) query = query.eq('user_id', userId);
                  if (status) query = query.eq('status', status);
                  const { count, error } = await query;
                  if (error) throw error;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ count }));
                } else {
                  const { data, error } = await supabase.from('rfq_history').select('*').order('created_at', { ascending: false });
                  if (error) throw error;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                }
              } else if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', async () => {
                  try {
                    const { id, updates } = JSON.parse(body);
                    const { data, error } = await supabase.from('rfq_history').update(updates).eq('id', id).select();
                    if (error) throw error;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: e.message }));
                  }
                });
              } else if (req.method === 'DELETE') {
                const urlObj = new URL(req.url, 'http://' + req.headers.host);
                const id = urlObj.searchParams.get('id');
                const { error } = await supabase.from('rfq_history').delete().eq('id', id);
                if (error) throw error;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              }
            } catch (error) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: error.message }));
            }
          });
        } else if (req.url.startsWith('/.netlify/functions/admin-products') && req.method === 'DELETE') {
          import('@supabase/supabase-js').then(async ({ createClient }) => {
            const { loadEnv } = await import('vite');
            const env = loadEnv('development', process.cwd(), '');
            const supabaseUrl = env.VITE_SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
            if (!supabaseUrl || !supabaseKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Missing Supabase env vars' }));
            }
            const supabase = createClient(supabaseUrl, supabaseKey);
            try {
              const urlObj = new URL(req.url, 'http://' + req.headers.host);
              const id = urlObj.searchParams.get('id');
              if (!id) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Missing product id' }));
              }
              await supabase.from('pricing_tiers').delete().eq('product_id', id);
              await supabase.from('product_assets').delete().eq('product_id', id);
              const { error } = await supabase.from('products').delete().eq('id', id);
              if (error) throw error;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error.message }));
            }
          });
        } else if (req.url.startsWith('/.netlify/functions/admin-profiles') && req.method === 'GET') {
          // Setup Supabase with Service Role to bypass RLS for Admin
          import('@supabase/supabase-js').then(async ({ createClient }) => {
            const { loadEnv } = await import('vite');
            const env = loadEnv('development', process.cwd(), '');
            const supabaseUrl = env.VITE_SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
            
            if (!supabaseUrl || !supabaseKey) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: "Missing Supabase env vars" }));
              return;
            }

            const supabase = createClient(supabaseUrl, supabaseKey);
            try {
              const { data, error } = await supabase.from('profiles').select('*');
              if (error) throw error;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            } catch (error) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: error.message }));
            }
          });
        } else if (req.url.startsWith('/.netlify/functions/storage-upload') && req.method === 'POST') {
          // Setup Supabase with Service Role to bypass RLS for Storage Uploads using body payload
          let body = '';
          // To handle large base64 bodies, maybe need chunks
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              import('@supabase/supabase-js').then(async ({ createClient }) => {
                const { loadEnv } = await import('vite');
                const env = loadEnv('development', process.cwd(), '');
                const supabaseUrl = env.VITE_SUPABASE_URL;
                const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
                if (!supabaseUrl || !supabaseKey) {
                  res.statusCode = 500;
                  return res.end(JSON.stringify({ error: "Missing Supabase env vars" }));
                }
                const supabase = createClient(supabaseUrl, supabaseKey);
                try {
                  const payload = JSON.parse(body);
                  const { fileBase64, fileName, filePath, contentType, bucket = 'product_assets' } = payload;
                  
                  if (!fileBase64 || !filePath) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: 'Missing fileBase64 or filePath' }));
                  }

                  const fileBuffer = Buffer.from(fileBase64, 'base64');
                  const { data, error } = await supabase.storage
                    .from(bucket)
                    .upload(filePath, fileBuffer, {
                      upsert: true,
                      contentType: contentType || 'application/octet-stream',
                      cacheControl: '3600'
                    });
                  if (error) throw error;
                  
                  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, path: data.path, publicUrl: publicData.publicUrl }));
                } catch(e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
            } catch(e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } else if (req.url.startsWith('/.netlify/functions/marketplace-checkout') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { loadEnv } = await import('vite');
              const env = loadEnv('development', process.cwd(), '');
              const stripeKey = env.STRIPE_SECRET_KEY;
              if (!stripeKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }));
              }
              const Stripe = (await import('stripe')).default;
              const stripe = new Stripe(stripeKey);
              const payload = JSON.parse(body);
              const { userId, userEmail, items, shippingAddress, orderRef } = payload;

              const line_items = (items || []).map(item => ({
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: item.name || item.mpn || 'Marketplace Item',
                    description: item.supplier_name ? `Supplier: ${item.supplier_name}` : undefined,
                  },
                  unit_amount: Math.round((item.price || 0) * 100),
                },
                quantity: item.quantity || 1,
              }));

              const subtotal = (items||[]).reduce((s, i) => s + (i.price||0) * (i.quantity||1), 0);
              const gst = Math.round(subtotal * 0.1 * 100);
              if (gst > 0) {
                line_items.push({
                  price_data: { currency: 'usd', product_data: { name: 'GST (10%)' }, unit_amount: gst },
                  quantity: 1,
                });
              }

              const origin = 'http://localhost:5173';
              const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items,
                mode: 'payment',
                client_reference_id: userId,
                customer_email: userEmail || undefined,
                metadata: { orderRef: orderRef || '', userId },
                success_url: `${origin}/app.html?mkt_checkout=success&ref=${orderRef || ''}`,
                cancel_url: `${origin}/app.html?mkt_checkout=canceled`,
              });

              console.log(`\n[Stripe Marketplace] Session ${session.id} for ${userEmail}\n`);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ url: session.url, sessionId: session.id }));
            } catch (e) {
              console.error('Marketplace checkout proxy error:', e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } else if (req.url.startsWith('/.netlify/functions/send-email') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              console.log('\n=======================================');
              console.log('📧 MOCK EMAIL DISPATCHED (Local Dev)');
              console.log('Type:', payload.type);
              console.log('To:', payload.email || 'info@atlasdt.com');
              console.log('Subject/Project:', payload.projectName || 'N/A');
              if (payload.reason) console.log('Reason:', payload.reason);
              console.log('=======================================\n');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: "Mock email dispatched successfully." }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } else if (req.url.startsWith('/.netlify/functions/webhook-sharepoint') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body);
              const { loadEnv } = await import('vite');
              const env = loadEnv('development', process.cwd(), '');
              const MICROSOFT_SHAREPOINT_WEBHOOK_URL = env.MICROSOFT_SHAREPOINT_WEBHOOK_URL;
              
              console.log('[SharePoint Local Mock] Payload received:', JSON.stringify(payload, null, 2));
              if (!MICROSOFT_SHAREPOINT_WEBHOOK_URL) {
                console.warn('[SharePoint Local Mock] MICROSOFT_SHAREPOINT_WEBHOOK_URL is not set. Skipping SharePoint sync locally.');
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, message: 'SharePoint sync skipped (No Webhook URL configured)' }));
              }
              
              const sharepointPayload = {
                file_name: payload.file_name,
                file_url: payload.file_url,
                folder_path: payload.folder_path || 'General',
                metadata: payload.metadata || {}
              };
              
              const spRes = await fetch(MICROSOFT_SHAREPOINT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sharepointPayload)
              });
              
              if (!spRes.ok) throw new Error(`SharePoint Webhook responded with status: ${spRes.status}`);
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'File synced to SharePoint successfully' }));
            } catch (e) {
              console.error('Error syncing to SharePoint locally:', e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [crudPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        advantage: resolve(__dirname, 'advantage.html'),
        app: resolve(__dirname, 'app.html'),
        portfolio: resolve(__dirname, 'portfolio.html'),
        services: resolve(__dirname, 'services.html'),
        workspace: resolve(__dirname, 'workspace.html'),
        admin: resolve(__dirname, 'admin.html'),
        profile: resolve(__dirname, 'profile.html'),
        "supplier-dashboard": resolve(__dirname, 'supplier-dashboard.html'),
        blog: resolve(__dirname, 'blog.html'),
        "conditions-of-sale": resolve(__dirname, 'conditions-of-sale.html'),
        "cookie-policy": resolve(__dirname, 'cookie-policy.html'),
        "data-protection": resolve(__dirname, 'data-protection.html'),
        "email-security": resolve(__dirname, 'email-security.html'),
        faq: resolve(__dirname, 'faq.html'),
        nda: resolve(__dirname, 'nda.html'),
        "privacy-policy": resolve(__dirname, 'privacy-policy.html'),
        "website-terms": resolve(__dirname, 'website-terms.html')
      }
    }
  }
});
