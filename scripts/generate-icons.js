const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 at start of each row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Calculate nice gradient and rounded icon badge
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width * 0.44;

      if (dist <= radius) {
        // Gradient from Indigo to Violet
        const factor = (x + y) / (width + height);
        const curR = Math.floor(79 + factor * 50);  // ~#4f46e5 to #818cf8
        const curG = Math.floor(70 + factor * 20);
        const curB = Math.floor(229 + factor * 20);

        // Simple badge inside
        const innerDx = Math.abs(dx);
        const innerDy = Math.abs(dy);
        const isCenterIcon = (innerDx < width * 0.18 && innerDy < height * 0.18);
        const isBar1 = (dx > -width * 0.15 && dx < -width * 0.05 && dy > -height * 0.05 && dy < height * 0.15);
        const isBar2 = (dx > -width * 0.02 && dx < width * 0.08 && dy > -height * 0.15 && dy < height * 0.15);
        const isBar3 = (dx > width * 0.11 && dx < width * 0.21 && dy > -height * 0.22 && dy < height * 0.15);

        if (isBar1 || isBar2 || isBar3) {
          rawData[pixelOffset] = 255;
          rawData[pixelOffset + 1] = 255;
          rawData[pixelOffset + 2] = 255;
          rawData[pixelOffset + 3] = 255;
        } else {
          rawData[pixelOffset] = curR;
          rawData[pixelOffset + 1] = curG;
          rawData[pixelOffset + 2] = curB;
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Transparent outside circular badge
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createPng(192, 192, 79, 70, 229));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createPng(512, 512, 79, 70, 229));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), createPng(512, 512, 79, 70, 229));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createPng(180, 180, 79, 70, 229));

console.log('Successfully generated PWA PNG icons!');
