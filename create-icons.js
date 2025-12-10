const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const logoPath = path.join(publicDir, 'logo.png');

// Copy logo to different icon names
const iconNames = [
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'favicon.ico'
];

iconNames.forEach(iconName => {
  const targetPath = path.join(publicDir, iconName);
  fs.copyFileSync(logoPath, targetPath);
  console.log(`✓ Created ${iconName}`);
});

console.log('\n✅ All PWA icons created successfully!');
