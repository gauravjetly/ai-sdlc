#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlFile, 'utf8');

console.log('Creating comprehensive project details view...');

// Remove tabs navigation (lines around 3611-3633)
// Replace the tabs div with a simple header
let modified = html.replace(
  /\{\/\* Tabs \*\/\}\s*<div style=\{\{ display: 'flex'[^}]+borderBottom: activeTab[^}]+\}\}>\s*\{tabs\.map[^}]+\}\}\s*<\/div>/s,
  `{/* Comprehensive View - No Tabs */}`
);

// Remove all tab conditionals - make all content visible
// Pattern: {activeTab === 'X' && (
modified = modified.replace(/\{activeTab === ['"]overview['"] && \(/g, '{true && (');
modified = modified.replace(/\{activeTab === ['"]agents['"] && \(/g, '{true && (');
modified = modified.replace(/\{activeTab === ['"]documentation['"] && \(/g, '{true && (');
modified = modified.replace(/\{activeTab === ['"]readme['"] && \(/g, '{true && (');
modified = modified.replace(/\{activeTab === ['"]implementation['"] && \(/g, '{true && (');
modified = modified.replace(/\{activeTab === ['"]changelog['"] && \(/g, '{true && (');
modified = modified.replace(/\{activeTab === ['"]costs['"] && \(/g, '{true && (');

// Remove activeTab state initialization (not needed anymore)
// But keep it to avoid errors - just won't be used

// Remove tab definitions const tabs = [...]
modified = modified.replace(
  /const tabs = \[\s*\{[^}]+\}[,\s]*\{[^}]+\}[,\s]*\{[^}]+\}[,\s]*\{[^}]+\}[,\s]*\{[^}]+\}[,\s]*\{[^}]+\}[,\s]*\];/s,
  '// Tabs removed - comprehensive view shows all content'
);

console.log('✓ Transformed HTML to show all content');

// Write the modified HTML
fs.writeFileSync(htmlFile, modified, 'utf8');

console.log('✓ Saved comprehensive view to index.html');
console.log('\nRestart the dashboard server to see changes:');
console.log('  cd dashboard && node server.js');
