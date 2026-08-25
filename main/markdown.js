const { marked } = require('marked');
const katex = require('katex');
const markedKatex = require('marked-katex-extension');

marked.use(markedKatex({
  inlineRenderer: (tex) => katex.renderToString(tex, { displayMode: false, throwOnError: false }),
  displayRenderer: (tex) => katex.renderToString(tex, { displayMode: true, throwOnError: false }),
}));

marked.setOptions({
  breaks: true,
  gfm: true,
});

function renderMarkdown(md) {
  return marked.parse(md);
}

function cleanHtmlForDocx(html) {
  let cleaned = html || '';
  // Replace input checkboxes with readable symbols
  cleaned = cleaned.replace(/<input[^>]*checked[^>]*>/gi, '☑ ');
  cleaned = cleaned.replace(/<input[^>]*>/gi, '☐ ');
  // Clean KaTeX: remove katex-html duplicate rendering block to avoid double text in word
  cleaned = cleaned.replace(/<span class="katex-html"[^>]*>[\s\S]*?<\/span><\/span>/gi, '');
  // Remove images with invalid src to prevent html-to-docx parser crashes
  cleaned = cleaned.replace(/<img[^>]*src=["'](?!https?:\/\/|data:image\/(?:png|jpeg|jpg);base64,)[^"']*["'][^>]*>/gi, '');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${cleaned}</body></html>`;
}

module.exports = { renderMarkdown, cleanHtmlForDocx };
