'use strict';

/**
 * WordprocessingML → Markdown, platform neutral.
 *
 * Both the Electron main process (`src/main/docx.js`, after unzipping with
 * `readZip`) and the Android plugin host (`unzipSync` from fflate) feed the same
 * `document.xml` / `styles.xml` text through this module, so import results are
 * identical on every platform.
 *
 * Keep this file free of Node built-ins — it is bundled for the browser too.
 */

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0'
};

function decodeEntities(text) {
  if (!text.includes('&')) return text;
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith('#x')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, entity) ? ENTITIES[entity] : match;
  });
}

function findTagEnd(text, start) {
  let quote = '';
  for (let index = start + 1; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '>') return index;
  }
  return text.length - 1;
}

function parseAttributes(source) {
  const attributes = {};
  const pattern = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(source))) {
    attributes[match[1]] = decodeEntities(match[3] !== undefined ? match[3] : match[4]);
  }
  return attributes;
}

/**
 * Parse the well-formed subset of XML that Word writes. Text nodes are stored as
 * `{ name: '#text', text }`, elements as `{ name, attrs, children }`.
 */
function parseXml(text) {
  const root = { name: '#document', attrs: {}, children: [] };
  const stack = [root];
  let index = 0;

  const pushText = (raw) => {
    if (!raw) return;
    stack[stack.length - 1].children.push({ name: '#text', text: decodeEntities(raw) });
  };

  while (index < text.length) {
    const lt = text.indexOf('<', index);
    if (lt < 0) {
      pushText(text.slice(index));
      break;
    }
    if (lt > index) pushText(text.slice(index, lt));

    if (text.startsWith('<!--', lt)) {
      const end = text.indexOf('-->', lt + 4);
      index = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', lt)) {
      const end = text.indexOf(']]>', lt + 9);
      pushText(text.slice(lt + 9, end < 0 ? text.length : end));
      index = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith('<?', lt) || text.startsWith('<!', lt)) {
      const end = text.indexOf('>', lt);
      index = end < 0 ? text.length : end + 1;
      continue;
    }

    const gt = findTagEnd(text, lt);
    const raw = text.slice(lt + 1, gt);
    if (raw.startsWith('/')) {
      const name = raw.slice(1).trim();
      for (let depth = stack.length - 1; depth > 0; depth -= 1) {
        if (stack[depth].name === name) {
          stack.length = depth;
          break;
        }
      }
    } else {
      const selfClosing = raw.endsWith('/');
      const body = selfClosing ? raw.slice(0, -1) : raw;
      const space = body.search(/\s/);
      const name = (space < 0 ? body : body.slice(0, space)).trim();
      if (name) {
        const node = { name, attrs: space < 0 ? {} : parseAttributes(body.slice(space)), children: [] };
        stack[stack.length - 1].children.push(node);
        if (!selfClosing) stack.push(node);
      }
    }
    index = gt + 1;
  }

  return root;
}

function childNamed(node, name) {
  return node.children.find((item) => item.name === name);
}

function childrenNamed(node, name) {
  return node.children.filter((item) => item.name === name);
}

function findNamed(node, name) {
  if (!node.children) return null;
  for (const item of node.children) {
    if (item.name === name) return item;
    const found = findNamed(item, name);
    if (found) return found;
  }
  return null;
}

function collectNamed(node, name, found = []) {
  if (!node.children) return found;
  for (const item of node.children) {
    if (item.name === name) found.push(item);
    collectNamed(item, name, found);
  }
  return found;
}

function textOf(node) {
  return node.children
    .filter((item) => item.name === '#text')
    .map((item) => item.text)
    .join('');
}

function escapeMarkdown(text) {
  return text.replace(/([\\`*_[\]])/g, '\\$1');
}

function runFormat(run) {
  const properties = childNamed(run, 'w:rPr');
  if (!properties) return { bold: false, italic: false, strike: false, code: false };
  const enabled = (name) => {
    const node = childNamed(properties, name);
    if (!node) return false;
    const value = node.attrs['w:val'];
    return !(value === '0' || value === 'false' || value === 'none');
  };
  const fonts = childNamed(properties, 'w:rFonts');
  const fontName = [fonts?.attrs['w:ascii'], fonts?.attrs['w:hAnsi'], fonts?.attrs['w:cs']]
    .filter(Boolean)
    .join(' ');
  return {
    bold: enabled('w:b'),
    italic: enabled('w:i'),
    strike: enabled('w:strike'),
    code: /(mono|courier|consolas|menlo|code)/i.test(fontName)
  };
}

function runText(run) {
  const parts = [];
  for (const node of run.children) {
    if (node.name === 'w:t') parts.push(escapeMarkdown(textOf(node)));
    else if (node.name === 'w:tab') parts.push(' ');
    else if (node.name === 'w:br' || node.name === 'w:cr') parts.push('\n');
    else if (node.name === 'w:noBreakHyphen') parts.push('-');
  }
  return parts.join('');
}

function applyFormat(text, format) {
  if (!text.trim()) return text;
  const lead = /^\s*/.exec(text)[0];
  const trail = /\s*$/.exec(text)[0];
  let body = text.slice(lead.length, text.length - trail.length);
  if (format.code) body = `\`${body}\``;
  if (format.italic) body = `*${body}*`;
  if (format.bold) body = `**${body}**`;
  if (format.strike) body = `~~${body}~~`;
  return lead + body + trail;
}

function inlineMarkdown(node, state) {
  const pieces = [];
  for (const item of node.children) {
    if (item.name === 'w:r') {
      if (childNamed(item, 'w:drawing') || childNamed(item, 'w:pict')) state.images += 1;
      pieces.push(applyFormat(runText(item), runFormat(item)));
    } else if (
      item.name === 'w:hyperlink' ||
      item.name === 'w:smartTag' ||
      item.name === 'w:ins' ||
      item.name === 'w:sdt' ||
      item.name === 'w:sdtContent' ||
      item.name === 'w:fldSimple'
    ) {
      pieces.push(inlineMarkdown(item, state));
    } else if (item.name === 'w:drawing' || item.name === 'w:pict') {
      state.images += 1;
    }
  }
  return pieces.join('');
}

function paragraphStyle(paragraph) {
  const properties = childNamed(paragraph, 'w:pPr');
  const style = properties ? childNamed(properties, 'w:pStyle') : null;
  return style?.attrs['w:val'] || '';
}

function headingLevel(style) {
  const value = String(style || '').trim();
  if (!value) return 0;
  const heading = /^heading\s*([1-6])$/i.exec(value);
  if (heading) return Number(heading[1]);
  const numeric = /^([1-6])$/.exec(value);
  return numeric ? Number(numeric[1]) : 0;
}

/* Numbering usually lives on the paragraph style (List Bullet, 列表段落), not on
   the paragraph itself, so both have to be consulted. */
function readStyles(stylesXml) {
  const styles = new Map();
  if (!stylesXml) return styles;
  const root = parseXml(stylesXml);
  for (const style of collectNamed(root, 'w:style')) {
    const id = style.attrs['w:styleId'];
    if (!id) continue;
    const name = childNamed(style, 'w:name');
    const basedOn = childNamed(style, 'w:basedOn');
    const properties = childNamed(style, 'w:pPr');
    styles.set(id, {
      name: name?.attrs['w:val'] || '',
      numbered: Boolean(properties && childNamed(properties, 'w:numPr')),
      basedOn: basedOn?.attrs['w:val'] || ''
    });
  }
  return styles;
}

function isNumberedParagraph(paragraph, styles) {
  const properties = childNamed(paragraph, 'w:pPr');
  if (properties && childNamed(properties, 'w:numPr')) return true;
  let current = styles.get(paragraphStyle(paragraph));
  let depth = 0;
  while (current && depth < 8) {
    if (current.numbered) return true;
    current = current.basedOn ? styles.get(current.basedOn) : null;
    depth += 1;
  }
  return false;
}

function paragraphMarkdown(paragraph, state, styles) {
  let text = inlineMarkdown(paragraph, state).replace(/[ \t]+$/gm, '');
  const styleId = paragraphStyle(paragraph);
  const styleName = styles.get(styleId)?.name || '';
  const level = headingLevel(styleId) || headingLevel(styleName);
  if (level) {
    text = `${'#'.repeat(level)} ${text.trim()}`;
  } else if (/^title$/i.test(styleId) || /^title$/i.test(styleName)) {
    text = `# ${text.trim()}`;
  } else if (/subtitle/i.test(styleId) || /subtitle/i.test(styleName)) {
    text = `## ${text.trim()}`;
  } else if (/quote/i.test(styleId) || /quote/i.test(styleName)) {
    text = text
      .split('\n')
      .map((line) => (line.trim() ? `> ${line}` : '>'))
      .join('\n');
  } else if (isNumberedParagraph(paragraph, styles)) {
    text = text
      .split('\n')
      .map((line) => (line.trim() ? `- ${line}` : line))
      .join('\n');
  }
  return text;
}

function cellText(cell, state) {
  return childrenNamed(cell, 'w:p')
    .map((paragraph) => inlineMarkdown(paragraph, state).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

function tableMarkdown(table, state) {
  const rows = childrenNamed(table, 'w:tr').map((row) =>
    childrenNamed(row, 'w:tc').map((cell) => cellText(cell, state))
  );
  if (!rows.length) return '';
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (!width) return '';
  const line = (cells) =>
    `| ${Array.from({ length: width }, (_, index) => (cells[index] || '').replace(/\|/g, '\\|')).join(' | ')} |`;
  const separator = `| ${Array.from({ length: width }, () => '---').join(' | ')} |`;
  return [line(rows[0]), separator, ...rows.slice(1).map(line)].join('\n');
}

function bodyMarkdown(body, state, styles) {
  const blocks = [];
  for (const node of body.children) {
    if (node.name === 'w:p') blocks.push(paragraphMarkdown(node, state, styles));
    else if (node.name === 'w:tbl') blocks.push(tableMarkdown(node, state));
    else if (node.name === 'w:sdt') {
      const content = childNamed(node, 'w:sdtContent');
      if (content) blocks.push(...bodyMarkdown(content, state, styles));
    }
  }
  return blocks;
}

/**
 * Convert the body XML of a .docx (and optional styles.xml) into Markdown.
 * Returns the same shape as the desktop importer: `{ markdown, warnings, imageCount }`.
 */
function convertDocumentXml(documentXml, stylesXml = '') {
  const xml = String(documentXml || '');
  if (!xml.trim()) throw new Error('缺少文档正文');
  const root = parseXml(xml);
  const body = findNamed(root, 'w:body');
  if (!body) throw new Error('缺少文档正文');
  const styles = readStyles(stylesXml);
  const state = { images: 0 };
  const markdown = bodyMarkdown(body, state, styles)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const warnings = [];
  if (state.images) warnings.push(`文档中的 ${state.images} 张图片未导入`);
  if (!markdown) warnings.push('文档里没有可识别的文字');
  return { markdown, warnings, imageCount: state.images };
}

module.exports = { convertDocumentXml, decodeEntities, escapeMarkdown };
