with open('frontend/src/styles.css', 'a', encoding='utf-8') as f:
    f.write('''
.admin-page {
  max-width: 100%;
  overflow-x: hidden;
}

.admin-header {
  margin-bottom: 24px;
}

.admin-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 24px;
}

.admin-tabs button {
  padding: 12px 24px;
  background: transparent;
  border: none;
  font-weight: 600;
  color: #718096;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.admin-tabs button.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.admin-table-container {
  overflow-x: auto;
}

/* Fix for the screenshot's squashed sidebar */
.sidebar-link span {
  pointer-events: none; /* Ensure click goes to the Link component */
}
''')
