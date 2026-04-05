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
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
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
        signup: resolve(__dirname, 'signup.html')
      }
    }
  }
});
