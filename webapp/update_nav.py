import os
import glob

html_files = glob.glob('c:/Users/sebas/OneDrive/Desktop/DUMP/Antigravity Projects/002_Pearl River Delta PRD/webapp/*.html')

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # 1. Remove Project Quote nav link
    if 'href="/app.html#project-quote"' in content:
        lines = content.split('\n')
        new_lines = []
        skip = 0
        for line in lines:
            if skip > 0:
                skip -= 1
                continue
            if 'href="/app.html#project-quote"' in line and 'class="global-nav-link"' in line:
                skip = 3
                modified = True
                continue
            new_lines.append(line)
        content = '\n'.join(new_lines)
        
    # 2. Update Component Instant Quote nav link
    if 'href="/app.html#rfq"' in content and 'Component' in content and 'Instant Quote' in content:
        lines = content.split('\n')
        new_lines = []
        for i, line in enumerate(lines):
            if 'href="/app.html#rfq"' in line and 'class="global-nav-link"' in line:
                if i + 2 < len(lines):
                    if '>Component<' in lines[i+1] and '>Instant Quote<' in lines[i+2]:
                        lines[i+1] = lines[i+1].replace('>Component<', '>Quote<')
                        lines[i+2] = lines[i+2].replace('>Instant Quote<', '>Instantly<')
                        modified = True
            new_lines.append(line)
        content = '\n'.join(new_lines)

    if modified:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {os.path.basename(file)}')

print('Done.')
