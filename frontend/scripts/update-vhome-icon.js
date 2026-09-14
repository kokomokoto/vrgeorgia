const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function main() {
  const userSrc =
    process.argv[2] ||
    path.resolve(
      process.env.USERPROFILE || '',
      '.cursor/projects/c-Users-ATA-Desktop-vrgeorgia-vrgeorgia1/assets/c__Users_ATA_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-aa108cf7-54f9-41e0-b09b-e789b3329245.png'
    );
  const matchSrc =
    path.resolve(
      process.env.USERPROFILE || '',
      '.cursor/projects/c-Users-ATA-Desktop-vrgeorgia-vrgeorgia1/assets/vhome-icon-match.png'
    );

  // Prefer user-provided photo; fall back to generated match.
  const src = fs.existsSync(userSrc) ? userSrc : matchSrc;
  console.log('source', src);

  // Make near-white / light-gray background transparent
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 235 && g > 235 && b > 235) {
      data[i + 3] = 0;
    } else if (r > 210 && g > 210 && b > 210) {
      const t = (Math.min(r, g, b) - 210) / 45;
      data[i + 3] = Math.round(255 * (1 - Math.max(0, Math.min(1, t))));
    }
  }

  const transparent = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  fs.writeFileSync('public/images/vhome-icon-raster.png', transparent);
  fs.writeFileSync('public/images/vhome-icon.png', transparent);

  // Also render path SVG as alternate crisp vector export
  const svgBuf = await sharp('public/images/vhome-icon.svg', { density: 400 })
    .resize(1024, 1024)
    .png()
    .toBuffer();
  fs.writeFileSync('public/images/vhome-icon-paths-preview.png', svgBuf);

  // Header / favicon set from the exact transparent raster (matches user's photo)
  await sharp(transparent).resize(512, 512).png().toFile('app/icon.png');
  await sharp(transparent).resize(180, 180).png().toFile('app/apple-icon.png');
  await sharp(transparent).resize(32, 32).png().toFile('public/favicon-32.png');
  await sharp(transparent).resize(16, 16).png().toFile('public/favicon-16.png');

  const png32 = await sharp(transparent).resize(32, 32).png().toBuffer();
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = 32;
  entry[1] = 32;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png32.length, 8);
  entry.writeUInt32LE(22, 12);
  fs.writeFileSync('public/favicon.ico', Buffer.concat([header, entry, png32]));

  // Favicon SVG embeds exact transparent artwork (scales without white bg)
  const b64 = transparent.toString('base64');
  const favSvg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Vhome">',
    `  <image width="1024" height="1024" href="data:image/png;base64,${b64}"/>`,
    '</svg>',
    '',
  ].join('\n');
  // Keep hand path SVG as vhome-icon-paths.svg; main brand mark uses exact photo
  fs.copyFileSync('public/images/vhome-icon.svg', 'public/images/vhome-icon-paths.svg');
  fs.writeFileSync('public/images/vhome-icon.svg', favSvg);
  fs.writeFileSync('public/favicon.svg', favSvg);

  console.log('updated icon assets', {
    png: fs.statSync('public/images/vhome-icon.png').size,
    svg: fs.statSync('public/images/vhome-icon.svg').size,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
