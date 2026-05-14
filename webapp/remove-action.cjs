const fs = require('fs');
const glob = require('glob');
const files = glob.sync('**/*.html', { ignore: ['node_modules/**', 'dist/**'] });
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('action="https://formsubmit.co/info@atlasdt.com"')) {
    content = content.replace(/action="https:\/\/formsubmit\.co\/info@atlasdt\.com"/g, '');
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
}
