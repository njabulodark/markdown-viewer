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

function unescapeHtml(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function extractHeadings(html) {
  if (!html) return [];
  const headings = [];
  const used = new Set();
  const re = /<h([1-4])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    let inner = match[2];
    // Drop the visual katex duplicate so math headings keep readable text
    inner = inner.replace(/<span class="katex-html"[^>]*>[\s\S]*?<\/span><\/span>/gi, '');
    const text = unescapeHtml(inner.replace(/<[^>]*>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    let slug = slugify(text) || `heading-${headings.length + 1}`;
    if (used.has(slug)) {
      let n = 1;
      while (used.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }
    used.add(slug);
    headings.push({ level: Number(match[1]), text, slug });
  }
  return headings;
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

module.exports = { renderMarkdown, cleanHtmlForDocx, extractHeadings };
