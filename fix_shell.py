import re

with open('frontend/src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Ensure app-shell is flex
if '.app-shell {' not in css:
    css += '''
.app-shell {
  display: flex;
  min-height: 100vh;
  width: 100%;
}
'''
else:
    css = re.sub(r'\.app-shell\s*\{[^}]*\}', '.app-shell {\n  display: flex;\n  min-height: 100vh;\n  width: 100%;\n}', css)

# Make sure main content doesn't overflow
css = re.sub(r'\.content\s*\{[^}]*\}', '.content {\n  flex: 1;\n  min-width: 0;\n  padding: 24px;\n  background-color: var(--bg-main);\n  overflow-y: auto;\n}', css)

with open('frontend/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("App shell styles updated")
