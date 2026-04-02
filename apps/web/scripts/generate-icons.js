const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const outputDir = path.join(__dirname, '..', 'public', 'icons');

const sizes = [
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
];

async function generateIcons() {
  if (!fs.existsSync(svgPath)) {
    console.error('SVG source file not found:', svgPath);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, name));
    console.log(`Generated: ${name}`);
  }

  // Generate a favicon.ico placeholder (using 32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(outputDir, 'favicon.ico'));
  console.log('Generated: favicon.ico (as PNG)');

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
