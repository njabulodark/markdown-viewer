const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cleanHtmlForDocx, renderMarkdown } = require('../main/markdown');

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
