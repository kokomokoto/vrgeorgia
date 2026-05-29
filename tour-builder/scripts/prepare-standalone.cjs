const fs = require('node:fs');
const path = require('node:path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyRecursive(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

const root = process.cwd();
copyRecursive(
  path.join(root, '.next', 'static'),
  path.join(root, '.next', 'standalone', '.next', 'static')
);
const publicDir = path.join(root, 'public');
if (fs.existsSync(publicDir)) {
  copyRecursive(publicDir, path.join(root, '.next', 'standalone', 'public'));
}
