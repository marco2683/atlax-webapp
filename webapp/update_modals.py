import sys

with open('profile.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
html = re.sub(
    r'<div class=\"auth-modal-glass\"[^>]*>\s*<button class=\"close-auth-modal\" id=\"close-role-onboarding\">\&times;<\/button>',
    '<div class="auth-modal-glass modal-expanded" style="max-width: 900px; padding: 0; border: 1px solid rgba(255,255,255,0.05); text-align: left; overflow: hidden; background: #0d1117; width: 90%; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">\n      <button class="close-auth-modal" id="close-role-onboarding" style="z-index: 10;">&times;</button>',
    html
)

with open('profile.html', 'w', encoding='utf-8') as f:
    f.write(html)


with open('src/js/profile-app.js', 'r', encoding='utf-8') as f:
    js = f.read()

designer_start = "if (planType === 'designer') {\n        html = `"
designer_end = "        `;\n      } else {"
designer_new = """if (planType === 'designer') {
        html = `
          <div style="display: flex; flex-direction: row; align-items: stretch; min-height: 480px;">
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
          </div>`
      } else {"""

entrepreneur_start = "} else {\n        html = `"
entrepreneur_end = "        `;\n      }\n      \n      onboardingContent"
entrepreneur_new = """} else {
        html = `
          <div style="display: flex; flex-direction: row; align-items: stretch; min-height: 480px;">
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
          </div>`
      }
      
      onboardingContent"""

def replace_between(text, start, end, new):
    idx = text.find(start)
    if idx == -1: return text
    idx2 = text.find(end, idx)
    if idx2 == -1: return text
    return text[:idx] + new + text[idx2+len(end):]

js = replace_between(js, designer_start, designer_end, designer_new)
js = replace_between(js, entrepreneur_start, entrepreneur_end, entrepreneur_new)

with open('src/js/profile-app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Done python script")
