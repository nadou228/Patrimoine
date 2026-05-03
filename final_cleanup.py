import re

with open('frontend/src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Aggressively remove all sidebar and layout related blocks
selectors_to_kill = [
    r'\.sidebar\s*\{[^}]*\}',
    r'\.sidebar-nav\s*\{[^}]*\}',
    r'\.sidebar-link\s*\{[^}]*\}',
    r'\.sidebar-link::before\s*\{[^}]*\}',
    r'\.sidebar-link::after\s*\{[^}]*\}',
    r'\.brand\s*\{[^}]*\}',
    r'\.brand-name\s*\{[^}]*\}',
    r'\.brand-subtitle\s*\{[^}]*\}',
    r'\.sidebar-account\s*\{[^}]*\}',
    r'\.nav-group-panel\s*\{[^}]*\}',
    r'\.nav-group-panel\.open\s*\{[^}]*\}',
    r'\.app-shell\s*\{[^}]*\}',
    r'\.content\s*\{[^}]*\}',
    r'\.sidebar-nav\s*a\s*\{[^}]*\}',
    r'\.sidebar-nav\s*a:hover[^}]*\}',
    r'\.sidebar-nav\s*a\.active\s*\{[^}]*\}',
    r'\.nav-icon\s*\{[^}]*\}',
    r'\.nav-label\s*\{[^}]*\}'
]

for pattern in selectors_to_kill:
    css = re.sub(pattern, '', css, flags=re.IGNORECASE)

# Clean up global table overflow
css += '''
/* GLOBAL FIXES */
.app-shell {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background-color: var(--bg-main);
  overflow: hidden; /* Prevent body scroll if content handles it */
}

.sidebar {
  width: var(--sidebar-width);
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  z-index: 1000;
  flex-shrink: 0;
}

.brand {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.brand-copy {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
  margin: 0;
  line-height: 1.2;
}

.brand-subtitle {
  font-size: 10px;
  color: #718096;
  font-weight: 500;
}

.sidebar-account {
  padding: 12px;
  margin: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-nav {
  padding: 12px;
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-group {
  margin-bottom: 16px;
}

.nav-group-title {
  font-size: 11px;
  font-weight: 700;
  color: #a0aec0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  display: block;
  padding-left: 12px;
}

.sidebar-link {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 10px 12px !important;
  color: #4a5568 !important;
  text-decoration: none !important;
  border-radius: 6px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  transition: all 0.2s !important;
  position: relative !important;
  border: none !important;
  background: transparent !important;
  width: 100% !important;
  text-align: left !important;
}

.sidebar-link:hover {
  background-color: #f0f7fb !important;
  color: var(--primary) !important;
}

.sidebar-link.active {
  background-color: #e6f6ff !important;
  color: var(--primary) !important;
  font-weight: 600 !important;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content {
  flex: 1;
  min-width: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 32px;
  background-color: var(--bg-main);
}

/* FIX TABLES */
.admin-table-container, .roles-matrix-container, .direct-perms-container {
  width: 100%;
  overflow-x: auto;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-top: 16px;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

th, td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}

th {
  background: #f8fafc;
  font-weight: 600;
  color: #64748b;
  font-size: 12px;
  text-transform: uppercase;
}

/* Sidebar Footer */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e2e8f0;
}

.sidebar-logout {
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #e53e3e;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-logout:hover {
  background: #fff5f5;
  border-color: #feb2b2;
}
'''

with open('frontend/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Styles.css major cleanup and rebuild done")
