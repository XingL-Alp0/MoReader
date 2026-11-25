'use strict';

const zlib = require('node:zlib');

const MAX_ENTRIES = 400;
const MAX_ENTRY_SIZE = 12 * 1024 * 1024;
const MAX_TOTAL_SIZE = 40 * 1024 * 1024;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let index = 0; index < buffer.length; index += 1) {
    crc = CRC_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function doseTimestamp(date = new Date()) {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const day =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { time, day };
}

/**
 * Build a ZIP archive from `{ name, data }` entries.
 * Entries are deflated; the format is plain enough for Windows Explorer,
 * macOS Archive Utility and our own reader.
 */
function writeZip(entries) {
  const { time, day } = doseTimestamp();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(String(entry.name), 'utf8');
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const compressed = zlib.deflateRawSync(raw, { level: 9 });
    const checksum = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);

    localParts.push(local, name, compressed);
    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

function findEndOfCentralDirectory(buffer) {
  const minOffset = Math.max(0, buffer.length - 65557);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

/**
 * Read a ZIP archive into `{ name, data }` entries. Only stored and deflated
 * entries are supported, which covers every pack this app produces.
 */
function readZip(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22) {
    throw new Error('不是有效的 ZIP 文件');
  }
  const eocd = findEndOfCentralDirectory(buffer);
  if (eocd < 0) throw new Error('ZIP 结构损坏（找不到中央目录）');

  const count = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (count > MAX_ENTRIES) throw new Error(`ZIP 条目过多（${count}）`);
  if (centralOffset + centralSize > buffer.length) throw new Error('ZIP 中央目录越界');

  const entries = [];
  let totalSize = 0;
  let pointer = centralOffset;

  for (let index = 0; index < count; index += 1) {
    if (pointer + 46 > buffer.length) throw new Error('ZIP 中央目录不完整');
    if (buffer.readUInt32LE(pointer) !== 0x02014b50) throw new Error('ZIP 中央目录条目损坏');

    const flags = buffer.readUInt16LE(pointer + 8);
    const method = buffer.readUInt16LE(pointer + 10);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const rawSize = buffer.readUInt32LE(pointer + 24);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);

    if (flags & 0x0001) throw new Error('不支持加密的 ZIP');
    if (rawSize > MAX_ENTRY_SIZE) throw new Error('ZIP 中的单个文件过大');
    totalSize += rawSize;
    if (totalSize > MAX_TOTAL_SIZE) throw new Error('ZIP 解压后体积过大');

    const nameStart = pointer + 46;
    const name = buffer
      .subarray(nameStart, nameStart + nameLength)
      .toString('utf8')
      .replace(/\\/g, '/');

    if (localOffset + 30 > buffer.length) throw new Error('ZIP 本地头部越界');
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('ZIP 本地头部损坏');
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) throw new Error('ZIP 数据越界');

    const payload = buffer.subarray(dataStart, dataEnd);
    let data;
    if (method === 0) {
      data = Buffer.from(payload);
    } else if (method === 8) {
      data = zlib.inflateRawSync(payload, { maxOutputLength: MAX_ENTRY_SIZE });
    } else {
      throw new Error(`不支持的 ZIP 压缩方式（${method}）`);
    }
    if (data.length !== rawSize) throw new Error('ZIP 解压长度不匹配');

    entries.push({ name, data });
    pointer = nameStart + nameLength + extraLength + commentLength;
  }

  return entries;
}

module.exports = { writeZip, readZip, crc32 };
