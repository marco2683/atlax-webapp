const fs = require('fs');
const indexHtml = fs.readFileSync('index.html', 'utf-8');

// Strip the main body content (hero and everything until footer)
// We'll replace everything between <!-- ── Hero Section ... and <!-- ── Authentication Modal
const startTag = '<!-- ── Hero Section';
const endTag = '<footer id="footer"';

const startIdx = indexHtml.indexOf(startTag);
const endIdx = indexHtml.indexOf(endTag, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find tags');
  process.exit(1);
}

const beforeContent = indexHtml.substring(0, startIdx);
const afterContent = indexHtml.substring(endIdx);

const pages = [
  { name: 'services.html', title: 'Services | Product Design, DFM, Sourcing & Production Support | AtlasDT', desc: 'Engineering-led product design, DFM, cost-down, supplier sourcing, RFQ management, prototyping, and manufacturing support for hardware companies working with Asia.' },
  { name: 'who-we-help.html', title: 'Who We Help | Hardware Startups, Product Teams & Industrial SMEs | AtlasDT', desc: 'AtlasDT supports hardware founders, product teams, industrial SMEs, and companies manufacturing in China or Asia with design, sourcing, cost-down, and production execution.' },
  { name: 'how-it-works.html', title: 'How It Works | The AtlasDT Process', desc: 'A practical path from product uncertainty to manufacturing execution.' },
  { name: 'about.html', title: 'About AtlasDT | Melbourne-led, China-connected Manufacturing Partners', desc: 'We connect engineering intent with Asian manufacturing execution.' },
  { name: 'resources.html', title: 'Resources | AtlasDT Hardware Manufacturing Guides', desc: 'Practical guides and resources for hardware manufacturing, DFM, and Asian sourcing.' },
  { name: 'contact.html', title: 'Contact AtlasDT | Start a Project Review', desc: 'Tell us where your product is stuck. Send us your idea, CAD file, or manufacturing problem.' }
];

pages.forEach(p => {
  let content = beforeContent + 
    '<main style="padding: 150px 20px; min-height: 60vh; max-width: 1200px; margin: 0 auto; color: white;">\n' +
    '  <h1 style="font-size: 3rem; margin-bottom: 20px;">' + p.title.split('|')[0].trim() + '</h1>\n' +
    '  <p style="font-size: 1.2rem; color: #888;">This page is currently being rebuilt for the AtlasDT Clarity update.</p>\n' +
    '</main>\n' + 
    afterContent;
    
  // replace title
  content = content.replace(/<title>.*?<\/title>/, '<title>' + p.title + '</title>');
  // replace desc
  content = content.replace(/<meta name="description" content=".*?">/, '<meta name="description" content="' + p.desc + '">');
  
  fs.writeFileSync(p.name, content);
  console.log('Created ' + p.name);
});
