// ═══════════════════════════════════════════════════════════════
// Clark Golf Group — Build Script
// ───────────────────────────────────────────────────────────────
// This script compiles index_deploy.html (the SOURCE file with JSX)
// into index.html (the LIVE file that Vercel serves to users).
//
// You should NEVER edit index.html directly — it gets overwritten
// every time Vercel deploys. Always edit index_deploy.html.
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const babel = require('@babel/core');

const SRC = 'index_deploy.html';
const DST = 'index.html';

console.log('═════════════════════════════════════════════');
console.log('  Clark Golf Group — Build');
console.log('═════════════════════════════════════════════');

// Safety check 1: source file must exist
if (!fs.existsSync(SRC)) {
  console.error(`❌ FATAL: ${SRC} not found.`);
  process.exit(1);
}

const html = fs.readFileSync(SRC, 'utf8');
console.log(`📄 Reading ${SRC} (${(html.length / 1024).toFixed(1)} KB)`);

// Safety check 2: must have a Babel script block
const SCRIPT_START = '<script type="text/babel">';
const SCRIPT_END = '</script>';

const startIdx = html.indexOf(SCRIPT_START);
if (startIdx === -1) {
  console.error(`❌ FATAL: No <script type="text/babel"> block found in ${SRC}`);
  process.exit(1);
}

const codeStart = startIdx + SCRIPT_START.length;
const codeEnd = html.indexOf(SCRIPT_END, codeStart);
if (codeEnd === -1) {
  console.error(`❌ FATAL: Unclosed <script> tag in ${SRC}`);
  process.exit(1);
}

const jsxSource = html.slice(codeStart, codeEnd);
console.log(`🔍 Found JSX block: ${(jsxSource.length / 1024).toFixed(1)} KB`);

// Compile JSX → vanilla JS using Babel
let compiled;
console.log(`⚙️  Compiling JSX...`);
try {
  const result = babel.transformSync(jsxSource, {
    presets: [
      ['@babel/preset-env', { targets: { esmodules: true } }],
      '@babel/preset-react'
    ],
    compact: true,
    comments: false,
    filename: 'app.jsx'
  });
  compiled = result.code;
} catch (err) {
  console.error(`❌ FATAL: Babel compile failed.`);
  console.error(`   ${err.message}`);
  console.error(`   Check ${SRC} for syntax errors.`);
  process.exit(1);
}

console.log(`✓ Compiled: ${(compiled.length / 1024).toFixed(1)} KB`);

// Auto-generated warning banner
const banner = `
<!-- ════════════════════════════════════════════════════════════ -->
<!-- AUTO-GENERATED FILE — DO NOT EDIT                            -->
<!-- This file is built from index_deploy.html on every push.     -->
<!-- Any direct edits to index.html will be OVERWRITTEN.          -->
<!-- To make changes, edit index_deploy.html and push.            -->
<!-- Built: ${new Date().toISOString()}                  -->
<!-- ════════════════════════════════════════════════════════════ -->
`;

// Replace the Babel script block with compiled vanilla JS
let output = html.slice(0, startIdx) + '<script>' + compiled + html.slice(codeEnd);

// Remove the Babel-standalone CDN script (no longer needed in production)
output = output.replace(
  /<script src="https:\/\/unpkg\.com\/@babel\/standalone[^"]*"[^>]*>\s*<\/script>\s*/g,
  ''
);

// Remove the Babel preload hint too
output = output.replace(
  /<link rel="preload" as="script" href="https:\/\/unpkg\.com\/@babel\/standalone[^"]*"[^>]*\/?>\s*/g,
  ''
);

// Add the banner just after the <html> tag
output = output.replace('<html', banner + '<html');

// Safety check 3: output must contain key markers
const requiredMarkers = ['function App', 'ReactDOM', 'firebase', 'createRoot'];
const missing = requiredMarkers.filter(m => !output.includes(m));
if (missing.length > 0) {
  console.error(`❌ FATAL: Compiled output missing required markers: ${missing.join(', ')}`);
  process.exit(1);
}

// Safety check 4: babel-standalone must be REMOVED from output
if (output.includes('@babel/standalone')) {
  console.error(`❌ FATAL: Babel-standalone still in output. Build aborted.`);
  process.exit(1);
}

// Write the output
fs.writeFileSync(DST, output);
console.log(`💾 Wrote ${DST} (${(output.length / 1024).toFixed(1)} KB)`);
console.log('═════════════════════════════════════════════');
console.log('  ✅ BUILD SUCCESSFUL');
console.log('═════════════════════════════════════════════');
