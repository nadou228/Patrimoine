import re

with open('frontend/src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Update buttons to be more Doctolib-like (cleaner, 8px rounded)
css = re.sub(r'border-radius:\s*(?:16|18|20|22|24)px;', 'border-radius: 8px;', css)

# Specific button styles
css = re.sub(r'\.btn-primary\s*\{[^}]*\}', '.btn-primary {\n  background-color: var(--primary);\n  color: #ffffff;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 8px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: background-color 0.2s;\n}\n.btn-primary:hover {\n  background-color: #047bb5;\n}', css)

# Redesign executive-alert-card
css = re.sub(r'\.executive-alert-card\s*\{[^}]*\}', '.executive-alert-card {\n  padding: 16px;\n  border-radius: 8px;\n  border-left: 4px solid var(--border-color);\n  background: #ffffff;\n  box-shadow: 0 1px 3px rgba(0,0,0,0.1);\n}', css)

# Card styling
css = re.sub(r'\.card\s*\{[^}]*\}', '.card {\n  background: #ffffff;\n  border: 1px solid #e2e8f0;\n  border-radius: 8px;\n  box-shadow: 0 2px 4px rgba(0,0,0,0.05);\n  padding: 20px;\n  margin-bottom: 20px;\n}', css)

# Insight card styling
css = re.sub(r'\.insight-card\s*\{[^}]*\}', '.insight-card {\n  background: #ffffff;\n  border: 1px solid #e2e8f0;\n  border-radius: 8px;\n  padding: 16px;\n  box-shadow: 0 1px 2px rgba(0,0,0,0.05);\n}', css)

# Asset card styling
css = re.sub(r'\.asset-card\s*\{[^}]*\}', '.asset-card {\n  background: #ffffff;\n  border: 1px solid #e2e8f0;\n  border-radius: 8px;\n  padding: 20px;\n  box-shadow: 0 1px 3px rgba(0,0,0,0.1);\n}', css)

# Update alert colors to be cleaner
css = re.sub(r'\.executive-alert-card\.success\s*\{[^}]*\}', '.executive-alert-card.success {\n  border-left-color: var(--success);\n  background-color: #f0fdf4;\n}', css)
css = re.sub(r'\.executive-alert-card\.warning\s*\{[^}]*\}', '.executive-alert-card.warning {\n  border-left-color: var(--warning);\n  background-color: #fffbeb;\n}', css)
css = re.sub(r'\.executive-alert-card\.danger\s*\{[^}]*\}', '.executive-alert-card.danger {\n  border-left-color: var(--danger);\n  background-color: #fef2f2;\n}', css)

# Sidebar styling - more Doctolib-like (white, clean)
css = re.sub(r'\.sidebar\s*\{[^}]*\}', '.sidebar {\n  width: var(--sidebar-width);\n  background: #ffffff;\n  border-right: 1px solid #e2e8f0;\n  display: flex;\n  flex-direction: column;\n  height: 100vh;\n  position: sticky;\n  top: 0;\n  z-index: 100;\n}', css)
css = re.sub(r'\.sidebar-link\s*\{[^}]*\}', '.sidebar-link {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 16px;\n  color: #4a5568;\n  text-decoration: none;\n  border-radius: 6px;\n  margin-bottom: 4px;\n  transition: all 0.2s;\n}', css)
css = re.sub(r'\.sidebar-link:hover, \.sidebar-link\.active\s*\{[^}]*\}', '.sidebar-link:hover, .sidebar-link.active {\n  background-color: #f0f7fb;\n  color: var(--primary);\n}', css)

with open('frontend/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("styles.css refined")
