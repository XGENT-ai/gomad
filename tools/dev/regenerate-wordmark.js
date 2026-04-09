// tools/dev/regenerate-wordmark.js
// One-shot script to regenerate Wordmark.png and website/public/favicon.png
// with GoMad typography. Run manually when the visual identity changes.
// NOT executed at install, publish, or CI.

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('sharp is required for this script. Run: npm install --save-dev sharp');
  process.exit(1);
}
const path = require('node:path');
const fs = require('node:fs');

const repoRoot = path.join(__dirname, '..', '..');

const wordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="75">
  <rect width="500" height="75" fill="transparent"/>
  <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
        font-family="sans-serif" font-size="56" font-weight="700"
        fill="#0b7285">GoMad</text>
</svg>`;

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="64" height="64" fill="#0b7285"/>
  <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
        font-family="sans-serif" font-size="42" font-weight="700"
        fill="#ffffff">G</text>
</svg>`;

async function main() {
  await sharp(Buffer.from(wordmarkSvg)).png().toFile(path.join(repoRoot, 'Wordmark.png'));
  console.log('Wrote Wordmark.png (500x75)');

  const faviconDir = path.join(repoRoot, 'website', 'public');
  fs.mkdirSync(faviconDir, { recursive: true });
  await sharp(Buffer.from(faviconSvg)).resize(64, 64).png().toFile(path.join(faviconDir, 'favicon.png'));
  console.log('Wrote website/public/favicon.png (64x64)');
}

main().catch((error) => {
  console.error('Regeneration failed:', error);
  process.exit(1);
});
