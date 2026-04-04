import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800&display=swap');
body {
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
#logo-container {
  padding: 40px; 
  display: inline-block;
}
.atlasdt-logo {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  font-size: 80px;
  color: #fff;
  letter-spacing: -2px;
  display: flex;
  align-items: baseline;
  text-decoration: none;
}
.atlasdt-logo-dark { color: #000; }
.accent-x {
  color: #0ea5e9;
  margin-left: 2px;
  display: inline-block;
  text-shadow: 0 0 10px rgba(14, 165, 233, 0.4);
}
.dot-com {
  font-size: 30px;
  font-weight: 600;
  color: #888;
  margin-left: 4px;
}
`;

function getHtml(includeCom, isDark) {
  const comText = includeCom ? `<span class="dot-com">.com</span>` : '';
  const darkClass = isDark ? ' atlasdt-logo-dark' : '';
  
  return `
    <html>
      <head>
        <style>${css}</style>
      </head>
      <body>
        <div id="logo-container">
          <div class="atlasdt-logo${darkClass}">
            ATLA<span class="accent-x">X</span>${comText}
          </div>
        </div>
      </body>
    </html>
  `;
}

async function exportLogos() {
  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const outDir = path.join(__dirname, '..', 'public', 'logos');
  if(!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, {recursive: true});
  }

  async function snap(name, isCom, isDark, scale) {
    const html = getHtml(isCom, isDark);
    await page.setContent(html, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1000));
    await page.setViewport({ width: 1000, height: 400, deviceScaleFactor: scale });
    const ele = await page.$('#logo-container');
    const outputPath = path.join(outDir, name);
    await ele.screenshot({ path: outputPath, omitBackground: true });
    console.log('Saved -> ', outputPath);
  }

  const scales = [
    { postfix: '', s: 1 },
    { postfix: '@2x', s: 2 },
    { postfix: '@4x', s: 4 }
  ];

  for (let sc of scales) {
    // Light versions (White text, Blue X)
    await snap(`atlasdt-logo-light${sc.postfix}.png`, false, false, sc.s);
    await snap(`atlasdt-logo-com-light${sc.postfix}.png`, true, false, sc.s);
  }

  await browser.close();
  console.log("Logo generation complete!");
}

exportLogos().catch(console.error);

