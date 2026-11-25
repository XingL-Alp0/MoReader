'use strict';

/**
 * Headless tests for the .docx → Markdown converter.
 * Run with: node scripts/test-docx.js
 *
 * The fixtures are built in memory with the same ZIP writer the app uses, so no
 * binary assets are checked in.
 */

const assert = require('node:assert/strict');
const { unzipSync } = require('fflate');
const { docxToMarkdown } = require('../src/main/docx');
const { convertDocumentXml } = require('../src/shared/docx-markdown');
const { writeZip } = require('../src/main/zip');

const NAMESPACE =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

function makeDocx(bodyXml, stylesXml = '') {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NAMESPACE}><w:body>${bodyXml}</w:body></w:document>`;
  const entries = [
    { name: '[Content_Types].xml', data: '<Types/>' },
    { name: 'word/document.xml', data: Buffer.from(documentXml, 'utf8') }
  ];
  if (stylesXml) {
    entries.push({
      name: 'word/styles.xml',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><w:styles ${NAMESPACE}>${stylesXml}</w:styles>`, 'utf8')
    });
  }
  return writeZip(entries);
}

function paragraph(text, { style = '', bold = false, italic = false, num = false } = {}) {
  const properties = [];
  if (style) properties.push(`<w:pStyle w:val="${style}"/>`);
  if (num) properties.push('<w:numPr><w:ilvl w:val="0"/></w:numPr>');
  const runProperties = [];
  if (bold) runProperties.push('<w:b/>');
  if (italic) runProperties.push('<w:i/>');
  return `<w:p>${properties.length ? `<w:pPr>${properties.join('')}</w:pPr>` : ''}<w:r>${runProperties.length ? `<w:rPr>${runProperties.join('')}</w:rPr>` : ''}<w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

function main() {
  // 1. headings, inline formatting, lists
  const simple = docxToMarkdown(
    makeDocx(
      [
        paragraph('第一章', { style: 'Heading1' }),
        paragraph('小节', { style: '2' }),
        paragraph('普通段落'),
        paragraph('加粗文字', { bold: true }),
        paragraph('斜体文字', { italic: true }),
        paragraph('列表项', { num: true }),
        paragraph('引用文字', { style: 'Quote' })
      ].join('')
    )
  );
  assert.match(simple.markdown, /^# 第一章$/m);
  assert.match(simple.markdown, /^## 小节$/m);
  assert.match(simple.markdown, /普通段落/);
  assert.match(simple.markdown, /\*\*加粗文字\*\*/);
  assert.match(simple.markdown, /\*斜体文字\*/);
  assert.match(simple.markdown, /^- 列表项$/m);
  assert.match(simple.markdown, /^> 引用文字$/m);
  assert.equal(simple.warnings.length, 0);

  // 1b. list styles defined in styles.xml (Word's "List Bullet")
  const styledLists = docxToMarkdown(
    makeDocx(
      '<w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr><w:r><w:t>要点</w:t></w:r></w:p>',
      '<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr></w:style>'
    )
  );
  assert.match(styledLists.markdown, /^- 要点$/m);

  // 2. tables (first row becomes the header) and pipes inside cells
  const table = docxToMarkdown(    makeDocx(
      `<w:tbl>
        <w:tr><w:tc>${paragraph('列 A')}</w:tc><w:tc>${paragraph('列 B')}</w:tc></w:tr>
        <w:tr><w:tc>${paragraph('1')}</w:tc><w:tc>${paragraph('a|b')}</w:tc></w:tr>
      </w:tbl>`
    )
  );
  assert.match(table.markdown, /^\| 列 A \| 列 B \|$/m);
  assert.match(table.markdown, /^\| --- \| --- \|$/m);
  assert.match(table.markdown, /^\| 1 \| a\\\|b \|$/m);

  // 3. entities, markdown escaping and unknown markup
  const escaped = docxToMarkdown(
    makeDocx(paragraph('a &amp; b *c* [d] &#x4E2D;&#25991;'))
  );
  assert.equal(escaped.markdown, 'a & b \\*c\\* \\[d\\] 中文');

  // 4. images are skipped but reported
  const images = docxToMarkdown(
    makeDocx(`<w:p><w:r><w:drawing/></w:r><w:r><w:t>图后文字</w:t></w:r></w:p>`)
  );
  assert.equal(images.imageCount, 1);
  assert.match(images.warnings.join(''), /1 张图片未导入/);
  assert.match(images.markdown, /图后文字/);

  // 5. empty document
  const empty = docxToMarkdown(makeDocx(''));
  assert.equal(empty.markdown, '');
  assert.match(empty.warnings.join(''), /没有可识别的文字/);

  // 6. invalid inputs
  assert.throws(() => docxToMarkdown(Buffer.from('not a zip at all')), /ZIP/);
  const noBody = writeZip([
    { name: 'word/document.xml', data: '<w:document xmlns:w="x"><w:body/></w:document>' }
  ]);
  assert.equal(docxToMarkdown(noBody).markdown, '');
  const missing = writeZip([{ name: 'word/other.xml', data: '<xml/>' }]);
  assert.throws(() => docxToMarkdown(missing), /word\/document\.xml/);
  assert.throws(() => docxToMarkdown(Buffer.alloc(0)), /为空/);

  // 7. the Android host unpacks with fflate and calls the shared converter
  const androidZip = makeDocx(paragraph('安卓导入', { bold: true }));
  const androidEntries = unzipSync(androidZip);
  const androidResult = convertDocumentXml(
    Buffer.from(androidEntries['word/document.xml']).toString('utf8'),
    androidEntries['word/styles.xml']
      ? Buffer.from(androidEntries['word/styles.xml']).toString('utf8')
      : ''
  );
  assert.match(androidResult.markdown, /\*\*安卓导入\*\*/);
  assert.deepEqual(androidResult.warnings, []);

  console.log('docx converter tests passed');
}

main();
