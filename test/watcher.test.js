const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const fileWatcher = require('../main/watcher');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-watcher-'));
const fileA = path.join(dir, 'a.md');
const fileB = path.join(dir, 'b.md');

after(() => {
  fileWatcher.stopWatching();
  fs.rmSync(dir, { recursive: true, force: true });
});

function setDelay(content, filePath = fileA) {
  fs.writeFileSync(filePath, content, 'utf-8');
}

test('watches multiple paths simultaneously', (_t, done) => {
  fs.writeFileSync(fileA, 'a1', 'utf-8');
  fs.writeFileSync(fileB, 'b1', 'utf-8');
  let aChanged = 0;
  let bChanged = 0;
  fileWatcher.watchFile(fileA, () => { aChanged += 1; });
  fileWatcher.watchFile(fileB, () => { bChanged += 1; });
  assert.ok(fileWatcher.isWatching(fileA));
  assert.ok(fileWatcher.isWatching(fileB));
  assert.deepEqual(fileWatcher.getWatchedPaths().sort(), [fileA, fileB].sort());
  setDelay('a2', fileA);
  setDelay('b2', fileB);
  setTimeout(() => {
    try {
      assert.ok(aChanged >= 1, 'fileA change should fire');
      assert.ok(bChanged >= 1, 'fileB change should fire');
      done();
    } catch (err) {
      done(err);
    }
  }, 1200);
});

test('unwatchFile stops only the requested path', (_t, done) => {
  fileWatcher.unwatchFile(fileA);
  assert.ok(!fileWatcher.isWatching(fileA));
  assert.ok(fileWatcher.isWatching(fileB));
  setDelay('a3', fileA);
  setTimeout(() => {
    fileWatcher.stopWatching();
    assert.ok(!fileWatcher.isWatching(fileB));
    done();
  }, 800);
});
