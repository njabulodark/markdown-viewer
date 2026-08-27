const fs = require('fs');

const DEBOUNCE_MS = 300;

const entries = new Map();

function snapshot(entry) {
  try {
    const stat = fs.statSync(entry.filePath);
    entry.lastSignature = `${stat.mtimeMs}:${stat.size}`;
  } catch {
    entry.lastSignature = null;
  }
}

function scheduleChange(entry) {
  if (entry.debounceTimer) clearTimeout(entry.debounceTimer);
  entry.debounceTimer = setTimeout(() => {
    entry.debounceTimer = null;
    if (!entries.has(entry.filePath)) return;
    const previous = entry.lastSignature;
    snapshot(entry);
    if (entry.lastSignature !== previous && typeof entry.onChange === 'function') {
      entry.onChange();
    }
  }, DEBOUNCE_MS);
}

function watchFile(filePath, onChange) {
  if (!filePath) return;
  const existing = entries.get(filePath);
  if (existing) {
    existing.onChange = onChange;
    return;
  }
  const entry = { onChange, lastSignature: null, debounceTimer: null, watcher: null, filePath };
  snapshot(entry);
  try {
    entry.watcher = fs.watch(filePath, () => scheduleChange(entry));
    entry.watcher.on('error', () => unwatchFile(filePath));
  } catch {
    return;
  }
  entries.set(filePath, entry);
}

function unwatchFile(filePath) {
  const entry = entries.get(filePath);
  if (!entry) return;
  entries.delete(filePath);
  if (entry.debounceTimer) clearTimeout(entry.debounceTimer);
  if (entry.watcher) entry.watcher.close();
}

function stopWatching() {
  for (const filePath of [...entries.keys()]) {
    unwatchFile(filePath);
  }
}

function isWatching(filePath) {
  return entries.has(filePath);
}

function getWatchedPaths() {
  return [...entries.keys()];
}

module.exports = { watchFile, unwatchFile, stopWatching, isWatching, getWatchedPaths };
