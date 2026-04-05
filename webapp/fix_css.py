import os

filepath = r"src/css/layout.css"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace block by block
content = content.replace(
    ".navbar__logo {\n  align-items: center;\n  gap: var(--space-3);\n  flex-shrink: 0;\n  text-decoration: none;\n  display: flex\n}",
    ".navbar__logo {\n  align-items: center;\n  gap: var(--space-3);\n  flex-shrink: 0;\n  text-decoration: none;\n  display: flex;\n  flex: 1;\n  justify-content: flex-start;\n}"
)

content = content.replace(
    ".navbar__menu {\n  align-items: center;\n  gap: var(--space-1);\n  list-style: none;\n  display: flex\n}",
    ".navbar__menu {\n  align-items: center;\n  gap: var(--space-1);\n  list-style: none;\n  display: flex;\n  flex: 0 0 auto;\n  justify-content: center;\n}"
)

content = content.replace(
    ".navbar__actions {\n  align-items: center;\n  gap: var(--space-2);\n  display: flex\n}",
    ".navbar__actions {\n  align-items: center;\n  gap: var(--space-2);\n  display: flex;\n  flex: 1;\n  justify-content: flex-end;\n}"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("CSS updated successfully")
