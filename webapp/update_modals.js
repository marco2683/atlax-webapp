const fs = require('fs');

// 1. Update profile.html
let profileHtml = fs.readFileSync('profile.html', 'utf8');
profileHtml = profileHtml.replace(
  /<div class="auth-modal-glass"\s+style="max-width:\s*600px;\s*text-align:\s*center;">\s*<button class="close-auth-modal" id="close-role-onboarding">&times;<\/button>/g,
  `<div class="auth-modal-glass modal-expanded" style="max-width: 900px; padding: 0; border: 1px solid rgba(255,255,255,0.05); text-align: left; overflow: hidden; background: #0d1117; width: 90%; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">\n      <button class="close-auth-modal" id="close-role-onboarding" style="z-index: 10;">&times;</button>`
);
fs.writeFileSync('profile.html', profileHtml);
console.log("Updated profile.html");


// 2. Update profile-app.js layout strings
const designerHtmlOld = `<div style="margin-bottom: 24px; text-align: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(139, 92, 246, 1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            <h2 style="font-size: 28px; margin-bottom: 8px;">Join the Global Designer Network</h2>
            <p style="color: var(--color-steel-400); font-size: 15px; margin-bottom: 24px;">Gain visibility, secure international projects, and work directly with global hardware creators.</p>
            <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 24px; display: inline-block;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: rgba(139, 92, 246, 0.8); margin-bottom: 8px;">Designer Membership</div>
              <div style="font-size: 36px; font-weight: bold; color: white;">$29<span style="font-size: 16px; color: var(--color-steel-400); font-weight: normal;">/month</span></div>
            </div>
          </div>
          <p style="color: var(--color-steel-300); font-size: 14px; text-align: center; margin-bottom: 32px;">By proceeding, your profile will be listed globally and you'll be able to receive direct inquiries from Entrepreneurs.</p>
          <button class="btn-save" id="onboarding-checkout-btn" style="width: 100%; font-size: 16px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(124, 58, 237, 1));">Proceed to Secure Checkout</button>`;


const entrepreneurHtmlOld = `<div style="margin-bottom: 24px; text-align: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(249, 115, 22, 1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            <h2 style="font-size: 28px; margin-bottom: 8px;">Post Jobs & Build Teams</h2>
            <p style="color: var(--color-steel-400); font-size: 15px; margin-bottom: 24px;">Find top-tier engineering talent, post RFQs, and securely manage your product development phases.</p>
            <div style="background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 12px; padding: 24px; display: inline-block;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: rgba(249, 115, 22, 0.8); margin-bottom: 8px;">Entrepreneur Membership</div>
              <div style="font-size: 36px; font-weight: bold; color: white;">$49<span style="font-size: 16px; color: var(--color-steel-400); font-weight: normal;">/month</span></div>
            </div>
          </div>
          <p style="color: var(--color-steel-300); font-size: 14px; text-align: center; margin-bottom: 32px;">Proceed to upgrade your account and instantly start hiring and collaborating.</p>
          <button class="btn-save" id="onboarding-checkout-btn" style="width: 100%; font-size: 16px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.9), rgba(234, 88, 12, 1));">Proceed to Secure Checkout</button>`;


const designerHtmlNew = `<div style="display: flex; flex-direction: row; align-items: stretch; min-height: 480px;">
            <div style="flex: 1; min-width: 300px; background: url('/images/showcase-6.png') center/cover; position: relative; border-right: 1px solid rgba(255,255,255,0.05);">
              <div style="position: absolute; inset: 0; background: linear-gradient(to right, rgba(13,17,23,0), rgba(13,17,23,0.8));"></div>
            </div>
            <div style="flex: 1; padding: 48px; background: rgba(13, 17, 23, 1); display: flex; flex-direction: column; justify-content: center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(139, 92, 246, 1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 20px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              <h2 style="font-size: 32px; margin-bottom: 12px; line-height: 1.2;">Join the Network</h2>
              <p style="color: rgba(255,255,255,0.7); font-size: 15px; margin-bottom: 24px; line-height: 1.5;">Access a global market of hardware creators looking for your expertise. Get verified, pitch for projects, and guarantee milestone payouts through our escrow system.</p>
              
              <ul style="list-style: none; padding: 0; margin-bottom: 32px; display: flex; flex-direction: column; gap: 12px;">
                <li style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: #fff;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Verified Global Job Board</li>
                <li style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: #fff;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Professional Public Profile</li>
                <li style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: #fff;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Secured Milestone Payments</li>
              </ul>

              <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <span style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: rgba(139, 92, 246, 0.9); font-weight: 600;">Designer Role</span>
                <span style="font-size: 28px; font-weight: bold; color: white;">$29<span style="font-size: 14px; color: rgba(255,255,255,0.5); font-weight: normal;">/mo</span></span>
              </div>
              
              <button class="btn-save" id="onboarding-checkout-btn" style="width: 100%; font-size: 16px; padding: 16px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(124, 58, 237, 1)); border: none; border-radius: 8px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">Proceed to Secure Checkout <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
            </div>
          </div>`;

const entrepreneurHtmlNew = `<div style="display: flex; flex-direction: row; align-items: stretch; min-height: 480px;">
            <div style="flex: 1; min-width: 300px; background: url('/images/showcase-4.png') center/cover; position: relative; border-right: 1px solid rgba(255,255,255,0.05);">
              <div style="position: absolute; inset: 0; background: linear-gradient(to right, rgba(13,17,23,0), rgba(13,17,23,0.8));"></div>
            </div>
            <div style="flex: 1; padding: 48px; background: rgba(13, 17, 23, 1); display: flex; flex-direction: column; justify-content: center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(249, 115, 22, 1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 20px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              <h2 style="font-size: 32px; margin-bottom: 12px; line-height: 1.2;">Build Your Team</h2>
              <p style="color: rgba(255,255,255,0.7); font-size: 15px; margin-bottom: 24px; line-height: 1.5;">Post RFQs and instantly discover vetted talent. Manage NDAs, hire dedicated experts, and secure your product development phases.</p>
              
              <ul style="list-style: none; padding: 0; margin-bottom: 32px; display: flex; flex-direction: column; gap: 12px;">
                <li style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: #fff;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fdba74" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Post Unlimited Job RFQs</li>
                <li style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: #fff;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fdba74" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Secure Escrow & Milestones</li>
                <li style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: #fff;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fdba74" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Access Global Talent Network</li>
              </ul>

              <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <span style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: rgba(249, 115, 22, 0.9); font-weight: 600;">Entrepreneur</span>
                <span style="font-size: 28px; font-weight: bold; color: white;">$49<span style="font-size: 14px; color: rgba(255,255,255,0.5); font-weight: normal;">/mo</span></span>
              </div>
              
              <button class="btn-save" id="onboarding-checkout-btn" style="width: 100%; font-size: 16px; padding: 16px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.9), rgba(234, 88, 12, 1)); border: none; border-radius: 8px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">Proceed to Secure Checkout <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
            </div>
          </div>`;

let jsFile = fs.readFileSync('src/js/profile-app.js', 'utf8');
// remove whitespace differences by doing a very loose regex
const strip = str => str.replace(/\s+/g, '');
const strippedJs = strip(jsFile);
if (strippedJs.includes(strip(designerHtmlOld))) {
  console.log("Replacing designer HTML...");
  // Can't replace on stripped, need to do string building or regex block matches
}

// Actually since it's just code blocks, let's use a function that finds start and end and replaces.
function replaceBetween(str, startMarker, endMarker, newContent) {
    const startIndex = str.indexOf(startMarker);
    const endIndex = str.indexOf(endMarker, startIndex);
    if (startIndex !== -1 && endIndex !== -1) {
         return str.substring(0, startIndex) + newContent + str.substring(endIndex + endMarker.length);
    }
    return str;
}

jsFile = replaceBetween(
    jsFile,
    "      if (planType === 'designer') {\n        html = `",
    "        `;\n      } else {",
    "      if (planType === 'designer') {\n        html = `" + designerHtmlNew + "`\n      } else {"
);

jsFile = replaceBetween(
    jsFile,
    "      } else {\n        html = `",
    "        `;\n      }\n      \n      onboardingContent",
    "      } else {\n        html = `" + entrepreneurHtmlNew + "`\n      }\n      \n      onboardingContent"
);

fs.writeFileSync('src/js/profile-app.js', jsFile);
console.log("Updated profile-app.js HTML strings.");
