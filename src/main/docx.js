'use strict';

/**
 * Desktop Word (.docx / .docm) importer: unzip with the app's own ZIP reader and
 * hand the XML to the shared converter (also used by the Android plugin host).
 */

const { readZip } = require('./zip');
const { convertDocumentXml } = require('../shared/docx-markdown');

const MAX_DOCX_BYTES = 32 * 1024 * 1024;
const MAX_XML_CHARS = 24 * 1024 * 1024;

function docxToMarkdown(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('文件为空');
  if (buffer.length > MAX_DOCX_BYTES) throw new Error('文档超过 32 MB');
  const entries = readZip(buffer);
  const documentXml = entries.find((entry) => entry.name === 'word/document.xml');
  if (!documentXml) throw new Error('缺少 word/document.xml，不是 Word .docx 文档');
  const xml = documentXml.data.toString('utf8');
  if (xml.length > MAX_XML_CHARS) throw new Error('文档正文过大');
  const stylesXml = entries.find((entry) => entry.name === 'word/styles.xml');
  return convertDocumentXml(xml, stylesXml ? stylesXml.data.toString('utf8') : '');
}

module.exports = { docxToMarkdown, MAX_DOCX_BYTES };
