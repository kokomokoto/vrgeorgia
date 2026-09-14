const sharp = require('sharp');
const fs = require('fs');

async function main() {
  const raster = 'public/images/vhome-icon-raster.png';

  await sharp(raster)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('public/images/vhome-icon.png');
  await sharp(raster)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('app/icon.png');
  await sharp(raster)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('app/apple-icon.png');
  await sharp(raster)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('public/favicon-32.png');
  await sharp(raster)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('public/favicon-16.png');

  const png32 = await sharp(raster)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
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

  const big = await sharp(raster)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const b64 = big.toString('base64');
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Vhome">',
    `  <image width="1024" height="1024" href="data:image/png;base64,${b64}"/>`,
    '</svg>',
    '',
  ].join('\n');
  fs.writeFileSync('public/images/vhome-icon.svg', svg);
  fs.writeFileSync('public/favicon.svg', svg);

  console.log('exact transparent assets ready', {
    png: fs.statSync('public/images/vhome-icon.png').size,
    svg: fs.statSync('public/images/vhome-icon.svg').size,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
