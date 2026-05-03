import re

with open('frontend/src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Remove all occurrences of these blocks to start fresh
patterns_to_remove = [
    r'\.sidebar\s*\{[^}]*\}',
    r'\.sidebar-nav\s*\{[^}]*\}',
    r'\.sidebar-link\s*\{[^}]*\}',
    r'\.sidebar-nav\s*a\s*\{[^}]*\}',
    r'\.sidebar-nav\s*a:hover[^}]*\}',
    r'\.sidebar-nav\s*a\.active\s*\{[^}]*\}',
    r'\.brand\s*\{[^}]*\}',
    r'\.brand-name\s*\{[^}]*\}',
    r'\.brand-subtitle\s*\{[^}]*\}',
    r'\.sidebar-account\s*\{[^}]*\}'
]

for pattern in patterns_to_remove:
    css = re.sub(pattern, '', css)

# Add clean sidebar styles
clean_sidebar = '''
.sidebar {
  width: var(--sidebar-width);
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}

.brand {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
  margin: 0;
}

.brand-subtitle {
  font-size: 11px;
  color: #718096;
  display: block;
}

.sidebar-account {
  padding: 12px 16px;
  margin: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.sidebar-nav {
  padding: 8px 12px;
  flex-grow: 1;
  overflow-y: auto;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  color: #4a5568;
  text-decoration: none;
  border-radius: 8px;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}

.sidebar-link:hover {
  background-color: #f0f7fb;
  color: var(--primary);
}

.sidebar-link.active {
  background-color: #e6f6ff;
  color: var(--primary);
  font-weight: 600;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.nav-label {
  white-space: nowrap;
}
'''

css += '\n\n' + clean_sidebar

with open('frontend/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Sidebar CSS cleaned up")
