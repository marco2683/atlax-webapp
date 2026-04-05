import fs from 'fs';
import path from 'path';

const cssPath = path.join(process.cwd(), 'src/css/layout.css');
let css = fs.readFileSync(cssPath, 'utf8');

css += `
/* Fix for the navbar being pushed to the left because navbar__brand lacked flex: 1 */
.navbar__brand {
  flex: 1;
  display: flex;
  justify-content: flex-start;
}
`;

fs.writeFileSync(cssPath, css);
console.log('Fixed navbar brand flex property');
