import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});
