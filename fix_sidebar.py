import re

with open('frontend/src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Clean up brand area
css = re.sub(r'\.brand\s*\{[^}]*\}', '.brand {\n  padding: 24px;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  border-bottom: 1px solid #e2e8f0;\n  margin-bottom: 16px;\n}', css)
css = re.sub(r'\.brand-name\s*\{[^}]*\}', '.brand-name {\n  font-size: 20px;\n  font-weight: 700;\n  color: var(--primary);\n  letter-spacing: normal;\n}', css)
css = re.sub(r'\.brand-subtitle\s*\{[^}]*\}', '.brand-subtitle {\n  font-size: 11px;\n  color: #718096;\n  display: block;\n}', css)

# Clean up sidebar-account area
css = re.sub(r'\.sidebar-account\s*\{[^}]*\}', '.sidebar-account {\n  padding: 16px;\n  margin: 16px;\n  background: #f8fafc;\n  border-radius: 8px;\n  border: 1px solid #e2e8f0;\n}', css)

with open('frontend/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("sidebar styles updated")
