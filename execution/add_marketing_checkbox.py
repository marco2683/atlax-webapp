import os
import glob

def main():
    target_dir = r"c:\Users\sebas\OneDrive\Desktop\DUMP\Antigravity Projects\002_Pearl River Delta PRD\webapp"
    html_files = glob.glob(os.path.join(target_dir, "*.html"))
    
    marketing_html = """            <div class="auth-input-group" style="display: flex; gap: 10px; align-items: start; margin-top: 10px; margin-bottom: 15px;">
              <input type="checkbox" id="signup-marketing" style="margin-top: 4px;">
              <label for="signup-marketing" style="font-size: 12px; color: var(--color-steel-300); line-height: 1.4; padding-left: 0;">
                I would like to receive newsletters, promotions, and updates from Atlas DT.
              </label>
            </div>
            <div id="signup-error" class="auth-error-msg"></div>"""

    count = 0
    for file_path in html_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if 'id="signup-marketing"' in content:
            continue
            
        if '<div id="signup-error" class="auth-error-msg"></div>' in content:
            new_content = content.replace(
                '<div id="signup-error" class="auth-error-msg"></div>', 
                marketing_html
            )
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            count += 1
            print(f"Updated {os.path.basename(file_path)}")

    print(f"Successfully updated {count} files.")

if __name__ == "__main__":
    main()
