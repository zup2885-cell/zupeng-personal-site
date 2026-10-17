// Pure helpers shared by the browser and verification scripts.
export function cropRect(a, b, width, height) {
  const clamp = (v, max) => Math.max(0, Math.min(max, v));
  const x = Math.floor(clamp(Math.min(a.x, b.x), width));
  const y = Math.floor(clamp(Math.min(a.y, b.y), height));
  return { x, y, width: Math.ceil(clamp(Math.max(a.x, b.x), width)) - x, height: Math.ceil(clamp(Math.max(a.y, b.y), height)) - y };
}
export const safeName = name => (name || '阿祖截图').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 90) || '阿祖截图';
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
// Stored ZIP entries: images are already compressed; no third-party service is used.
export async function createZip(entries) {
  if (entries.length > 65535) throw new Error('一次最多导出 65535 张图片。');
  const body = [], directory = [];
  let offset = 0, directorySize = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const data = new Uint8Array(await entry.blob.arrayBuffer());
    const name = new TextEncoder().encode(`${String(i + 1).padStart(3, '0')}-${safeName(entry.name)}.png`);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true);
    lv.setUint16(12, 33, true); lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, name.length, true); local.set(name, 30);
    const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint16(14, 33, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46);
    body.push(local, data); directory.push(central); directorySize += central.length; offset += local.length + data.length;
    if (offset + directorySize > 0xffffffff) throw new Error('文件太多，请分批下载。');
  }
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true); ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
  return new Blob([...body, ...directory, end], { type: 'application/zip' });
}
