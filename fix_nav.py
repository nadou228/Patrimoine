import re

with open('frontend/src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Fix nav-group-panel to hide contents when not open
css = re.sub(r'\.nav-group-panel\s*\{[^}]*\}', '.nav-group-panel {\n  display: grid;\n  gap: 4px;\n  max-height: 0;\n  overflow: hidden;\n  transition: max-height 0.3s ease-out;\n}', css)
css = re.sub(r'\.nav-group-panel\.open\s*\{[^}]*\}', '.nav-group-panel.open {\n  max-height: 500px;\n}', css)

with open('frontend/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Nav group panel fixed")
