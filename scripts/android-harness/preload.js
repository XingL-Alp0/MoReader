'use strict';

const { contextBridge } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, 'store');
fs.mkdirSync(root, { recursive: true });

const store = new Map();
store.set('content://harness/doc.md', '# 测试文档\n\nHello **Android**\n');

function toFileUri(filePath) {
  return 'file:///' + filePath.replace(/\\/g, '/');
}

function filePathFromUri(uri) {
  try {
    return decodeURIComponent(new URL(uri).pathname).replace(/^\/([A-Za-z]:)/, '$1');
  } catch {
    return uri.replace(/^file:\/\//, '');
  }
}

const initialZip = process.env.HARNESS_INITIAL_ZIP;

const plugin = {
  async initial() {
    if (initialZip) {
      return { uri: toFileUri(initialZip), name: path.basename(initialZip), mime: 'application/zip' };
    }
    if (process.env.HARNESS_DOC) {
      const docPath = path.resolve(process.env.HARNESS_DOC);
      return { uri: toFileUri(docPath), name: path.basename(docPath), mime: 'text/markdown' };
    }
    return { uri: 'content://harness/doc.md', name: '测试.md', mime: 'text/markdown' };
  },
  async read({ uri, binary }) {
    if (binary) {
      const filePath = uri.startsWith('file://') ? filePathFromUri(uri) : '';
      const data = fs.readFileSync(filePath);
      return {
        uri,
        base64: data.toString('base64'),
        name: path.basename(filePath),
        size: data.length,
        mime: 'application/octet-stream'
      };
    }
    let text = store.get(uri);
    if (text === undefined && uri.startsWith('file://')) {
      text = fs.readFileSync(filePathFromUri(uri), 'utf8');
    }
    if (text === undefined) throw new Error('not found: ' + uri);
    return { uri, name: uri.split('/').pop(), text, size: text.length };
  },
  async write({ uri, text }) {
    if (process.env.HARNESS_READONLY === '1') {
      throw new Error('WRITE_DENIED: Permission Denial');
    }
    store.set(uri, text);
    return { uri, name: uri.split('/').pop(), size: text.length };
  },
  async create({ name, text, base64 }) {
    if (process.env.HARNESS_NO_SAVER === '1') {
      throw new Error('NO_SAVER');
    }
    const uri = 'content://harness/' + encodeURIComponent(name);
    store.set(uri, text ?? `[binary:${(base64 || '').length}]`);
    return { uri, name };
  },
  async shareSaved({ name, text }) {
    const target = path.join(root, 'saved', String(name || 'doc.md'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, String(text ?? ''), 'utf8');
    return { uri: toFileUri(target), path: target, name: path.basename(target) };
  },
  async removeAppDir({ path: relative }) {
    fs.rmSync(path.join(root, String(relative || '')), { recursive: true, force: true });
    return { removed: relative };
  },
  async pick(args = {}) {
    const mime = String(args.mime || '');
    const wantsDocx = /wordprocessingml/i.test(mime) || /\.docx?$/i.test(mime) || mime === '*/*';
    if (wantsDocx && process.env.HARNESS_DOCX) {
      const docxPath = path.resolve(process.env.HARNESS_DOCX);
      return {
        files: [
          {
            uri: toFileUri(docxPath),
            name: path.basename(docxPath),
            mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          }
        ]
      };
    }
    const zip = process.env.HARNESS_PLUGIN_ZIP;
    if (zip && /zip/i.test(mime)) {
      const zipPath = path.resolve(zip);
      return {
        files: [{ uri: toFileUri(zipPath), name: path.basename(zipPath), mime: 'application/zip' }]
      };
    }
    return { files: [] };
  },
  async writeAppFile({ path: relative, base64, text }) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (text != null) fs.writeFileSync(target, text, 'utf8');
    else fs.writeFileSync(target, Buffer.from(base64 || '', 'base64'));
    return { uri: toFileUri(target), path: target };
  },
  async appFileUri({ path: relative }) {
    const target = path.join(root, relative);
    return { uri: toFileUri(target), path: target };
  },
  async openUrl() {},
  async print() {},
  async addListener() {}
};

contextBridge.exposeInMainWorld('Capacitor', {
  isNativePlatform: () => true,
  convertFileSrc: (value) =>
    'https://localhost/_capacitor_file_/' + encodeURI(String(value || '')),
  Plugins: {
    MoReadFiles: plugin,
    Clipboard: { async write() {}, async read() { return { value: '' }; } },
    App: { async exitApp() {} }
  }
});

contextBridge.exposeInMainWorld('__harness', {
  list: () => Array.from(store.entries()),
  files: () => fs.readdirSync(root)
});
