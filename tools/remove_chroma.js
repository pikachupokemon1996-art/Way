const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  name.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('Not a PNG');
  let offset = 8;
  let width;
  let height;
  let colorType;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
        throw new Error('Only non-interlaced 8-bit PNG is supported');
      }
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += length + 12;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error(`Unsupported color type ${colorType}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * channels);
  let source = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[source++];
    const rowStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[source++];
      const left = x >= channels ? pixels[rowStart + x - channels] : 0;
      const up = y ? pixels[rowStart + x - stride] : 0;
      const upperLeft = y && x >= channels ? pixels[rowStart + x - stride - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) predictor = paeth(left, up, upperLeft);
      pixels[rowStart + x] = (value + predictor) & 255;
    }
  }
  return { width, height, channels, pixels };
}

function encodeRgba(width, height, rgba) {
  const stride = width * 4;
  const scanlines = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const target = y * (stride + 1);
    scanlines[target] = 0;
    rgba.copy(scanlines, target + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function removeChroma(file) {
  const image = decodePng(fs.readFileSync(file));
  const { width, height, channels, pixels } = image;
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  const key = [0, 1, 2].map((channel) => Math.round(corners.reduce(
    (sum, pixel) => sum + pixels[pixel * channels + channel], 0,
  ) / corners.length));
  const isKey = key[1] > 190 && key[0] < 80 && key[2] < 80
    || key[0] > 190 && key[2] > 150 && key[1] < 90;
  if (!isKey) return { changed: false, key };
  const rgba = Buffer.alloc(width * height * 4);
  let transparent = 0;
  for (let i = 0; i < width * height; i += 1) {
    const source = i * channels;
    const target = i * 4;
    const r = pixels[source];
    const g = pixels[source + 1];
    const b = pixels[source + 2];
    const distance = Math.hypot(r - key[0], g - key[1], b - key[2]);
    const alpha = distance <= 42 ? 0 : distance >= 135 ? 255 : Math.round((distance - 42) / 93 * 255);
    rgba[target] = r;
    rgba[target + 1] = g;
    rgba[target + 2] = b;
    rgba[target + 3] = channels === 4 ? Math.min(alpha, pixels[source + 3]) : alpha;
    if (rgba[target + 3] === 0) transparent += 1;
  }
  fs.writeFileSync(file, encodeRgba(width, height, rgba));
  return { changed: true, transparent, total: width * height, key };
}

module.exports = { decodePng, removeChroma };

if (require.main === module) {
  const directory = process.argv[2] || path.join(process.cwd(), 'assets', 'generated');
  for (const name of fs.readdirSync(directory).filter((file) => file.endsWith('.png'))) {
    const result = removeChroma(path.join(directory, name));
    console.log(name, JSON.stringify(result));
  }
}
