const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const recentFiles = require('../main/recentFiles');

function tmpStore(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-recents-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'recent-files.json');
}

test('ignores relative and falsy paths', (t) => {
  recentFiles.init(tmpStore(t));
  assert.deepEqual(recentFiles.add('foo.md'), []);
  assert.deepEqual(recentFiles.add(null), []);
  assert.deepEqual(recentFiles.list(), []);
});

test('adds absolute paths most-recent-first', (t) => {
  recentFiles.init(tmpStore(t));
  recentFiles.add('C:\\docs\\a.md');
  recentFiles.add('C:\\docs\\b.md');
  assert.deepEqual(recentFiles.list(), ['C:\\docs\\b.md', 'C:\\docs\\a.md']);
});

test('dedupes and moves existing entry to front', (t) => {
  recentFiles.init(tmpStore(t));
  recentFiles.add('C:\\a.md');
  recentFiles.add('C:\\b.md');
  recentFiles.add('C:\\a.md');
  assert.deepEqual(recentFiles.list(), ['C:\\a.md', 'C:\\b.md']);
});

test('caps list at MAX_RECENT_FILES', (t) => {
  recentFiles.init(tmpStore(t));
  for (let i = 0; i < recentFiles.MAX_RECENT_FILES + 5; i++) {
    recentFiles.add(`C:\\f${i}.md`);
  }
  const list = recentFiles.list();
  assert.equal(list.length, recentFiles.MAX_RECENT_FILES);
  assert.equal(list[0], `C:\\f${recentFiles.MAX_RECENT_FILES + 4}.md`);
});

test('persists across re-init from same store file', (t) => {
  const storePath = tmpStore(t);
  recentFiles.init(storePath);
  recentFiles.add('C:\\persisted.md');
  recentFiles.init(storePath);
  assert.deepEqual(recentFiles.list(), ['C:\\persisted.md']);
});

test('returns empty list for corrupt store file', (t) => {
  const storePath = tmpStore(t);
  fs.writeFileSync(storePath, '{not json', 'utf8');
  recentFiles.init(storePath);
  assert.deepEqual(recentFiles.list(), []);
});

test('clear empties the store', (t) => {
  const storePath = tmpStore(t);
  recentFiles.init(storePath);
  recentFiles.add('C:\\x.md');
  recentFiles.clear();
  recentFiles.init(storePath);
  assert.deepEqual(recentFiles.list(), []);
});
