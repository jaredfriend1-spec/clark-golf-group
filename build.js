// ═══════════════════════════════════════════════════════════════
// Clark Golf Group — Build Script
// ───────────────────────────────────────────────────────────────
// Compiles JSX source files into pre-compiled HTML for production.
// Removes the 3MB Babel-standalone download.
//
//   index_deploy.html  →  index.html
//   portal_deploy.html →  portal.html  (if exists)
//
// NEVER edit index.html or portal.html directly — they are
// auto-generated and will be overwritten on every push.
// Edit the *_deploy.html files instead.
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const babel = require('@babel/core');

const BUILDS = [
  { src: 'index_deploy.html', dst: 'index.html', required: true },
  { src: 'portal_deploy.html', dst: 'portal.html', required: false }
];

console.log('═════════════════════════════════════════════');
console.log('  Clark Golf Group — Build');
console.log('═════════════════════════════════════════════');

let buildCount = 0;

for (const { src, dst, required } of BUILDS) {
  if (!fs.existsSync(src)) {
    if (required) {
      console.error(`❌ FATAL: ${src} not found.`);
      process.exit(1);
    } else {
      console.log(`⏭️  Skipping ${src} (not present)`);
      continue;
    }
  }

  console.log('');
  console.log(`📄 Building ${src} → ${dst}`);

  const html = fs.readFileSync(src, 'utf8');
  console.log(`   Source: ${(html.length / 1024).toFixed(1)} KB`);

  const SCRIPT_START = '<script type="text/babel">';
  const SCRIPT_END = '</script>';

  const startIdx = html.indexOf(SCRIPT_START);
  if (startIdx === -1) {
    console.error(`   ❌ FATAL: No <script type="text/babel"> block found`);
    process.exit(1);
  }

  const codeStart = startIdx + SCRIPT_START.length;
  const codeEnd = html.indexOf(SCRIPT_END, codeStart);
  if (codeEnd === -1) {
    console.error(`   ❌ FATAL: Unclosed <script> tag`);
    process.exit(1);
  }

  const jsxSource = html.slice(codeStart, codeEnd);
  console.log(`   JSX: ${(jsxSource.length / 1024).toFixed(1)} KB`);

  let compiled;
  try {
    const result = babel.transformSync(jsxSource, {
      presets: [
        ['@babel/preset-env', { targets: { esmodules: true } }],
        '@babel/preset-react'
      ],
      compact: true,
      comments: false,
      filename: src
    });
    compiled = result.code;
  } catch (err) {
    console.error(`   ❌ FATAL: Babel compile failed`);
    console.error(`   ${err.message}`);
    process.exit(1);
  }

  console.log(`   Compiled: ${(compiled.length / 1024).toFixed(1)} KB`);

  // Auto-generated warning banner
  const banner = `
<!-- ════════════════════════════════════════════════════════════ -->
<!-- AUTO-GENERATED FILE — DO NOT EDIT                            -->
<!-- Built from ${src.padEnd(48)}-->
<!-- Built: ${new Date().toISOString().padEnd(50)}-->
<!-- Edit the source file, push, Vercel rebuilds automatically.   -->
<!-- ════════════════════════════════════════════════════════════ -->
`;

  // Replace the Babel script block with compiled vanilla JS
  let output = html.slice(0, startIdx) + '<script>' + compiled + html.slice(codeEnd);

  // Remove the Babel-standalone CDN script
  output = output.replace(
    /<script src="https:\/\/unpkg\.com\/@babel\/standalone[^"]*"[^>]*>\s*<\/script>\s*/g,
    ''
  );

  // Remove the Babel preload hint
  output = output.replace(
    /<link rel="preload" as="script" href="https:\/\/unpkg\.com\/@babel\/standalone[^"]*"[^>]*\/?>\s*/g,
    ''
  );

  // Add the banner just after the <html> tag
  output = output.replace('<html', banner + '<html');

  // Safety checks
  const requiredMarkers = ['ReactDOM', 'firebase', 'createRoot'];
  const missing = requiredMarkers.filter(m => !output.includes(m));
  if (missing.length > 0) {
    console.error(`   ❌ FATAL: Compiled output missing: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (output.includes('@babel/standalone')) {
    console.error(`   ❌ FATAL: Babel-standalone still in output`);
    process.exit(1);
  }

  fs.writeFileSync(dst, output);
  console.log(`   ✅ Wrote ${dst} (${(output.length / 1024).toFixed(1)} KB)`);
  buildCount++;
}

console.log('');
console.log('═════════════════════════════════════════════');
console.log(`  ✅ BUILD SUCCESSFUL — ${buildCount} file${buildCount === 1 ? '' : 's'} built`);
console.log('═════════════════════════════════════════════');
