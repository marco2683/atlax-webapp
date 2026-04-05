const fs = require('fs');
const cssAddition = `

/* FEATURE DEEP DIVE */
.sales-deep-dive {
  max-width: 1000px;
  margin: 80px auto;
  display: flex;
  flex-direction: column;
  gap: 80px;
}
.deep-dive-row {
  display: flex;
  align-items: center;
  gap: 60px;
}
.deep-dive-row.reverse {
  flex-direction: row-reverse;
}
.deep-dive-text {
  flex: 1;
}
.deep-dive-text h2 {
  font-size: 32px;
  margin-bottom: 24px;
  color: #fff;
}
.deep-dive-text p {
  font-size: 16px;
  color: rgba(255,255,255,0.7);
  line-height: 1.6;
  margin-bottom: 24px;
}
.deep-dive-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.deep-dive-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255,255,255,0.9);
  font-size: 15px;
}
.deep-dive-list svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.deep-dive-img {
  flex: 1;
}

@media (max-width: 768px) {
  .deep-dive-row, .deep-dive-row.reverse {
    flex-direction: column;
    gap: 40px;
  }
}
`;

let css = fs.readFileSync('src/css/supplier-engine.css', 'utf8');
if (!css.includes('.sales-deep-dive')) {
    css += cssAddition;
    fs.writeFileSync('src/css/supplier-engine.css', css);
    console.log("Appended CSS");
} else {
    console.log("CSS already exists");
}
