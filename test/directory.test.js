const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { listDirectory } = require('../main/directory');

function tmpDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-dir-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function names(entries) {
  return entries.map((e) => e.name);
}

test('keeps md, markdown and txt files (case-insensitive extensions)', (t) => {
  const dir = tmpDir(t);
  for (const f of ['a.md', 'b.MD', 'c.markdown', 'd.Markdown', 'e.txt']) {
    fs.writeFileSync(path.join(dir, f), 'x');
  }
  const names_ = names(listDirectory(dir));
  assert.deepEqual(names_.sort(), ['a.md', 'b.MD', 'c.markdown', 'd.Markdown', 'e.txt']);
});

test('excludes non-markdown files', (t) => {
  const dir = tmpDir(t);
  for (const f of ['img.png', 'doc.docx', 'script.js', 'readme']) {
    fs.writeFileSync(path.join(dir, f), 'x');
  }
  assert.deepEqual(listDirectory(dir), []);
});

test('excludes dotfiles and dotfolders', (t) => {
  const dir = tmpDir(t);
  fs.writeFileSync(path.join(dir, '.hidden.md'), 'x');
  fs.mkdirSync(path.join(dir, '.git'));
  fs.mkdirSync(path.join(dir, '.cache'));
  const entries = listDirectory(dir);
  assert.deepEqual(names(entries), []);
});

test('excludes node_modules but keeps other subfolders', (t) => {
  const dir = tmpDir(t);
  fs.mkdirSync(path.join(dir, 'node_modules'));
  fs.mkdirSync(path.join(dir, 'sub'));
  fs.mkdirSync(path.join(dir, 'nested'));
  const entries = listDirectory(dir);
  assert.deepEqual(names(entries), ['nested', 'sub']);
  assert.ok(entries.every((e) => e.isDir));
  assert.ok(entries.every((e) => e.path.startsWith(dir)));
});

test('sorts directories first, then case-insensitive alphabetical', (t) => {
  const dir = tmpDir(t);
  fs.mkdirSync(path.join(dir, 'zeta'));
  fs.mkdirSync(path.join(dir, 'Alpha'));
  fs.writeFileSync(path.join(dir, 'banana.md'), 'x');
  fs.writeFileSync(path.join(dir, 'apple.md'), 'x');
  const result = listDirectory(dir);
  assert.deepEqual(names(result), ['Alpha', 'zeta', 'apple.md', 'banana.md']);
  assert.deepEqual(result.map((e) => e.isDir), [true, true, false, false]);
});

test('returns empty array for an empty directory', (t) => {
  const dir = tmpDir(t);
  assert.deepEqual(listDirectory(dir), []);
});

test('throws for a missing directory', () => {
  const missing = path.join(os.tmpdir(), 'mv-dir-missing-never-created');
  assert.throws(() => listDirectory(missing));
});

test('throws for a path that is a file', (t) => {
  const dir = tmpDir(t);
  const file = path.join(dir, 'a.md');
  fs.writeFileSync(file, 'x');
  assert.throws(() => listDirectory(file));
});
