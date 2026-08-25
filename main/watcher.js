const fs = require('fs');

const DEBOUNCE_MS = 300;

let watcher = null;
let watchedPath = null;
let lastSignature = null;
let debounceTimer = null;

function snapshot() {
  if (!watchedPath) {
    lastSignature = null;
    return;
  }
  try {
    const stat = fs.statSync(watchedPath);
    lastSignature = `${stat.mtimeMs}:${stat.size}`;
  } catch {
    lastSignature = null;
  }
}

function scheduleChange(onChange) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const previous = lastSignature;
    snapshot();
    if (lastSignature !== previous && typeof onChange === 'function') {
      onChange();
    }
  }, DEBOUNCE_MS);
}

function watchFile(filePath, onChange) {
  stopWatching();
  watchedPath = filePath;
  snapshot();
  try {
    watcher = fs.watch(filePath, () => scheduleChange(onChange));
    watcher.on('error', () => stopWatching());
  } catch {
    watcher = null;
  }
}

function stopWatching() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  watchedPath = null;
  lastSignature = null;
}

function getWatchedPath() {
  return watchedPath;
}

module.exports = { watchFile, stopWatching, getWatchedPath };
