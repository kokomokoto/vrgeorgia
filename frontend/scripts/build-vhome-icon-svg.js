const potrace = require('potrace');
const fs = require('fs');
const sharp = require('sharp');

async function main() {
  const src = 'public/images/vhome-icon-raster.png';
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const frame = Buffer.alloc(data.length, 255);
  const greenLight = Buffer.alloc(data.length, 255);
  const greenDark = Buffer.alloc(data.length, 255);

  for (let i = 0; i < data.length; i += 4) {
    frame[i + 3] = 255;
    greenLight[i + 3] = 255;
    greenDark[i + 3] = 255;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 20) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const isGreen = g > r + 15 && g > b + 15 && g > 40;
    const isDark = max < 100 && max - min < 45 && !isGreen;
    if (isDark) {
      frame[i] = frame[i + 1] = frame[i + 2] = 0;
    }
    if (isGreen) {
      if (g < 120) {
        greenDark[i] = greenDark[i + 1] = greenDark[i + 2] = 0;
      } else {
        greenLight[i] = greenLight[i + 1] = greenLight[i + 2] = 0;
      }
    }
  }

  await sharp(frame, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile('public/images/_frame.png');
  await sharp(greenLight, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile('public/images/_green-light.png');
  await sharp(greenDark, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile('public/images/_green-dark.png');

  const trace = (file) =>
    new Promise((resolve, reject) => {
      potrace.trace(
        file,
        { color: '#000', background: 'transparent', turdSize: 20, optTolerance: 0.2 },
        (err, svg) => (err ? reject(err) : resolve(svg))
      );
    });

  const extractPaths = (svg) => {
    const paths = [];
    const re = /d="([^"]+)"/g;
    let m;
    while ((m = re.exec(svg))) paths.push(m[1]);
    return paths;
  };

  const [frameSvg, lightSvg, darkSvg] = await Promise.all([
    trace('public/images/_frame.png'),
    trace('public/images/_green-light.png'),
    trace('public/images/_green-dark.png'),
  ]);

  const size = 512;
  const sx = size / info.width;
  const sy = size / info.height;
  const layers = [
    { paths: extractPaths(frameSvg), fill: '#2C3138' },
    { paths: extractPaths(lightSvg), fill: '#45C028' },
    { paths: extractPaths(darkSvg), fill: '#1B6B12' },
  ];

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Vhome">`,
    `<g transform="scale(${sx.toFixed(6)} ${sy.toFixed(6)})">`,
  ];
  for (const layer of layers) {
    for (const d of layer.paths) {
      parts.push(`<path fill="${layer.fill}" d="${d}"/>`);
    }
  }
  parts.push('</g></svg>');

  fs.writeFileSync('public/images/vhome-icon.svg', parts.join('\n'));
  fs.copyFileSync('public/images/vhome-icon.svg', 'public/favicon.svg');
  console.log('ok layers', layers.map((l) => l.paths.length).join(','));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
