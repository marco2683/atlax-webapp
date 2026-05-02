import sys

with open('netlify/functions/send-email.js', 'r', encoding='utf-8') as f:
    code = f.read()

import re

# Update 'project_rfq'
old_rfq_start = "htmlContent = \\n          <div style=\"font-family: 'Inter', sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #333;\">"
old_rfq_end = "Copyright &copy; Atlas DT. All rights reserved.</span>\n            </div>\n          </div>\n        \;"

new_rfq = """htmlContent = \
          <div style="font-family: 'Inter', sans-serif; max-width: 640px; margin: 0 auto; padding: 32px 24px; color: #333; background-color: #f8fafc; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="\" alt="Atlas DT" style="height: 40px;" />
            </div>
            
            <div style="background: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
              <h2 style="color: #0ea5e9; font-size: 24px; margin-top: 0; margin-bottom: 16px;">We've received your request!</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
                Hi \,<br><br>
                This is the team from AtlasDT. We wanted to let you know that we've safely received your project quote request.
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                One of our engineers is reviewing your files right now. We will either get back to you shortly to request a bit more information, or we'll provide your full quotation within <strong>24 to 48 hours</strong>.
              </p>
              <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-top: 0; margin-bottom: 12px;">Project Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; font-weight: 600; color: #334155; width: 140px; font-size: 14px;">Project Name</td>
                    <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">\</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; font-weight: 600; color: #334155; font-size: 14px;">Service</td>
                    <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">\</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; font-weight: 600; color: #334155; font-size: 14px;">Est. Quantity</td>
                    <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">\</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; font-weight: 600; color: #334155; font-size: 14px;">Timeline</td>
                    <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">\</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #334155; font-size: 14px;">Files Uploaded</td>
                    <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">\ file(s)</td>
                  </tr>
                </table>
              </div>
              <h3 style="font-size: 14px; color: #334155; margin-bottom: 8px;">Uploaded Files</h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; margin-bottom: 24px;">\</ul>
              
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 0;">
                If you need to make any changes or have questions in the meantime, just reply directly to this email. We're here to help!
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">
                You can manage your requests in your <a href="https://atlasdt.com/workspace.html" style="color: #0ea5e9; text-decoration: none;">Workspace</a>.
              </p>
              <span style="font-size: 11px; color: #94a3b8;">&copy; \ AtlasDT. All rights reserved.</span>
            </div>
          </div>
        \;"""

# Replace project_rfq
start_idx = code.find(old_rfq_start)
end_idx = code.find(old_rfq_end, start_idx) + len(old_rfq_end)
if start_idx != -1 and end_idx != -1:
    code = code[:start_idx] + new_rfq + code[end_idx:]
else:
    print("Could not find project_rfq block")

# Update 'rfq_request_info'
old_info_start = "htmlContent = \\n          <div style=\"font-family:'Inter',sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#0f172a;\">"
old_info_end = "atlasdt.com</a></p>\n          </div>\n        \;"

new_info = """htmlContent = \
          <div style="font-family:'Inter',sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#0f172a;background:#f8fafc;border-radius:12px;">
            <div style="text-align:center;margin-bottom:32px;">
              <img src="\" alt="AtlasDT" style="height:36px;" />
            </div>
            <div style="background:#ffffff;padding:32px;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
              <h2 style="font-size:20px;margin-top:0;color:#334155;margin-bottom:16px;">We need a bit more info!</h2>
              <p style="font-size:15px;line-height:1.7;color:#475569;margin-bottom:24px;">
                Hi \,<br/><br/>
                Our engineering team is currently reviewing your quotation request for <strong>\</strong>, 
                but we just need a little bit more information before we can proceed with an accurate quote.
              </p>
              <div style="background:#f1f5f9;border-left:4px solid #3b82f6;padding:16px 20px;margin-bottom:28px;border-radius:0 8px 8px 0;">
                <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap;">\</p>
              </div>
              <p style="font-size:15px;line-height:1.7;color:#475569;margin-bottom:20px;">
                Please reply directly to this email with the requested details, and we'll get right back to working on your quote! If you'd like to reach out to your assigned engineer, <strong>\</strong>, you can do so here: <a href="mailto:\" style="color:#0ea5e9;">\</a>.
              </p>
              <p style="font-size:15px;color:#475569;margin-bottom:0;">Thanks,<br/>— \</p>
            </div>
            <div style="text-align:center;margin-top:24px;">
              <span style="font-size:11px;color:#94a3b8;">&copy; \ AtlasDT. All rights reserved.</span>
            </div>
          </div>
        \;"""

start_idx_info = code.find(old_info_start)
end_idx_info = code.find(old_info_end, start_idx_info) + len(old_info_end)
if start_idx_info != -1 and end_idx_info != -1:
    code = code[:start_idx_info] + new_info + code[end_idx_info:]
else:
    print("Could not find rfq_request_info block")

with open('netlify/functions/send-email.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updates applied")
