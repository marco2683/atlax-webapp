const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'webapp/src/js/components/product-builder-controller.js');
let data = fs.readFileSync(file, 'utf8');

// Replace escaped backticks with actual backticks
data = data.replace(/\\`/g, '`');
// Replace escaped dollar signs with actual dollar signs
data = data.replace(/\\\$/g, '$');

fs.writeFileSync(file, data, 'utf8');
console.log("Done");
