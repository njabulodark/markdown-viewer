const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cleanHtmlForDocx, extractHeadings, renderMarkdown } = require('../main/markdown');

test('wraps content in a full HTML document', () => {
  const result = cleanHtmlForDocx('<p>hello</p>');
  assert.match(result, /^<!DOCTYPE html><html><head><meta charset="utf-8"><\/head><body><p>hello<\/p><\/body><\/html>$/);
});

test('handles null and empty input', () => {
  for (const input of [null, undefined, '']) {
    const result = cleanHtmlForDocx(input);
    assert.ok(result.includes('<body></body>'));
  }
});

test('replaces checked checkbox inputs with a checked symbol', () => {
  const result = cleanHtmlForDocx('<li><input type="checkbox" checked disabled> done</li>');
  assert.ok(result.includes('☑ '), 'expected ☑ symbol');
  assert.ok(!result.includes('<input'), 'input tag should be removed');
});

test('replaces unchecked checkbox inputs with an unchecked symbol', () => {
  const result = cleanHtmlForDocx('<li><input type="checkbox" disabled> todo</li>');
  assert.ok(result.includes('☐ '), 'expected ☐ symbol');
  assert.ok(!result.includes('<input'));
});

test('removes the katex-html duplicate rendering block', () => {
  const html = '<span class="katex"><span class="katex-mathml">x</span>' +
    '<span class="katex-html" aria-hidden="true"><span class="base">x</span></span></span>';
  const result = cleanHtmlForDocx(html);
  assert.ok(!result.includes('katex-html'), 'katex-html block should be stripped');
  assert.ok(result.includes('katex-mathml'), 'mathml block should be kept');
});

test('removes images with relative or invalid src', () => {
  const cases = [
    '<img src="images/pic.png">',
    '<img src="./local.png">',
    '<img src="file:///C:/tmp/x.jpg">',
    '<img src="">',
  ];
  for (const img of cases) {
    assert.ok(!cleanHtmlForDocx(img).includes('<img'), `should remove: ${img}`);
  }
});

test('keeps remote https images', () => {
  const img = '<img src="https://example.com/pic.png">';
  assert.ok(cleanHtmlForDocx(img).includes('<img'));
});

test('keeps base64 data images', () => {
  const png = '<img src="data:image/png;base64,iVBORw0KGgo=">';
  const jpg = '<img src=\'data:image/jpeg;base64,/9j/4AAQ\'>';
  assert.ok(cleanHtmlForDocx(png).includes('<img'));
  assert.ok(cleanHtmlForDocx(jpg).includes('<img'));
});

test('renderMarkdown produces expected HTML for GFM', () => {
  const html = renderMarkdown('# Title\n\n- item');
  assert.ok(html.includes('<h1'), 'heading rendered');
  assert.ok(html.includes('<li>item</li>'), 'list item rendered');
});

test('renderMarkdown renders inline math via katex', () => {
  const html = renderMarkdown('$x^2$');
  assert.ok(html.includes('katex'), 'katex markup present');
});

test('extractHeadings returns empty array for falsy or heading-less html', () => {
  for (const input of [null, undefined, '', '<p>no headings here</p>']) {
    assert.deepEqual(extractHeadings(input), []);
  }
});

test('extractHeadings extracts levels and text in document order', () => {
  const html = '<h2>Beta</h2><h1>Alpha</h1><h3 id="x">Gamma</h3>';
  const result = extractHeadings(html);
  assert.deepEqual(result, [
    { level: 2, text: 'Beta', slug: 'beta' },
    { level: 1, text: 'Alpha', slug: 'alpha' },
    { level: 3, text: 'Gamma', slug: 'gamma' },
  ]);
});

test('extractHeadings ignores h5 and h6', () => {
  const html = '<h5>Five</h5><h6>Six</h6><h2>Keep</h2>';
  assert.deepEqual(extractHeadings(html), [{ level: 2, text: 'Keep', slug: 'keep' }]);
});

test('extractHeadings slugifies text', () => {
  const html = '<h1>Hello, World!</h1><h2>  Spaced   Out  </h2><h3>CamelCase Words</h3>';
  const slugs = extractHeadings(html).map(h => h.slug);
  assert.deepEqual(slugs, ['hello-world', 'spaced-out', 'camelcase-words']);
});

test('extractHeadings dedupes repeated headings with numeric suffixes', () => {
  const html = '<h2>Notes</h2><h2>Notes</h2><h2>Notes</h2>';
  const slugs = extractHeadings(html).map(h => h.slug);
  assert.deepEqual(slugs, ['notes', 'notes-1', 'notes-2']);
});

test('extractHeadings strips inline markup and unescapes entities', () => {
  const html = '<h2><em>Bold</em> <code>x</code> &amp; Friends</h2>';
  const result = extractHeadings(html);
  assert.equal(result.length, 1);
  assert.equal(result[0].text, 'Bold x & Friends');
  assert.equal(result[0].slug, 'bold-x-friends');
});

test('extractHeadings collapses whitespace inside heading text', () => {
  const html = '<h1>Line\n  break\ttab</h1>';
  const result = extractHeadings(html);
  assert.equal(result[0].text, 'Line break tab');
  assert.equal(result[0].slug, 'line-break-tab');
});

test('extractHeadings falls back to a positional slug when text is not slugable', () => {
  const html = '<h1>!!!</h1><h2>OK</h2>';
  const result = extractHeadings(html);
  assert.equal(result[0].slug, 'heading-1');
  assert.equal(result[1].slug, 'ok');
});

test('extractHeadings works on marked output end to end', () => {
  const html = renderMarkdown('# Title\n\n## Sub\n\n## Sub\n\n### Deep — dive!');
  const result = extractHeadings(html);
  assert.deepEqual(result.map(h => h.level), [1, 2, 2, 3]);
  assert.deepEqual(result.map(h => h.slug), ['title', 'sub', 'sub-1', 'deep-dive']);
});
