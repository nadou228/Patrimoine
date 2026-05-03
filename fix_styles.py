import re

with open('frontend/src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace :root primary colors
css = re.sub(r'--primary: #[0-9a-fA-F]+;', '--primary: #0596de;', css)
css = re.sub(r'--primary-glow: rgba\([^)]+\);', '--primary-glow: rgba(5, 150, 222, 0.25);', css)

# We will completely replace all [data-theme="light"] blocks with a single clean one
light_theme_block = '''[data-theme="light"] {
  --bg-main: #f5f9fb;
  --bg-sidebar: #ffffff;
  --bg-base: #f5f9fb;
  --bg-surface: #ffffff;
  --card-bg: #ffffff;
  --bg-card: #ffffff;
  --glass-border: #e2e8f0;
  --text-main: #0c192a;
  --text-primary: #0c192a;
  --text-secondary: #4b5563;
  --text-dim: #5c6c7f;
  --input-bg: #ffffff;
  --bg-input: #ffffff;
  --border-color: #e2e8f0;
  --shadow-premium: 0 4px 12px rgba(12, 25, 42, 0.05);
  --shadow: 0 4px 12px rgba(12, 25, 42, 0.05);
  --content-gradient: none;
  --primary: #0596de;
  --primary-glow: rgba(5, 150, 222, 0.25);
  --accent: #ff756b;
  --accent-hover: #e5655c;
  --success: #179354;
  --warning: #fca000;
  --danger: #e22b31;
  --bg-hover: #f0f7fb;
  --decision-bg: #f5f9fb;
  --decision-text: #0c192a;
}'''

css = re.sub(r'\[data-theme="light"\]\s*\{.*?\}(?=\s*\[|\s*\*|\s*body)', light_theme_block, css, flags=re.DOTALL)
# The regex might leave the second one if the first replace swallowed it or not. Let's do a more robust replace:
# Strip all [data-theme="light"] first
css = re.sub(r'\[data-theme="light"\]\s*\{[^}]*\}', '', css)
# Insert it after :root
css = re.sub(r'(:root\s*\{[^}]*\})', r'\1\n\n' + light_theme_block, css)

# Fix executive-main-grid overflow
css = re.sub(r'\.executive-main-grid\s*\{[^}]*\}', '.executive-main-grid {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 24px;\n}\n.executive-main-grid > * {\n  flex: 1 1 min(100%, 500px);\n}', css)

# Fix executive-kpi-grid overflow
css = re.sub(r'\.executive-kpi-grid\s*\{[^}]*\}', '.executive-kpi-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 14px;\n}', css)

# Fix border-radius on cards to look like Doctolib (rounded but not extremely pill-like)
css = re.sub(r'border-radius: 24px;', 'border-radius: 12px;', css)
css = re.sub(r'border-radius: 20px;', 'border-radius: 12px;', css)
css = re.sub(r'border-radius: 22px;', 'border-radius: 12px;', css)

# Restrict maximum width of content
css = re.sub(r'\.dashboard-module\s*\{[^}]*\}', '.dashboard-module {\n  max-width: 1400px;\n  margin: 0 auto;\n  width: 100%;\n}', css)
# If dashboard-module didn't exist in styles.css, let's append it
if '.dashboard-module {' not in css:
    css += '\n\n.dashboard-module {\n  max-width: 1400px;\n  margin: 0 auto;\n  width: 100%;\n}\n'

with open('frontend/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("styles.css updated")
