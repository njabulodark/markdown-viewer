const fs = require('fs');
const path = require('path');

const MAX_RECENT_FILES = 10;

let storePath = null;

function init(filePath) {
  storePath = filePath;
}

function load() {
  if (!storePath) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => typeof p === 'string' && p.length > 0);
  } catch {
    return [];
  }
}

function save(list) {
  if (!storePath) return;
  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to persist recent files:', err.message);
  }
}

function list() {
  return load();
}

function add(filePath) {
  if (!filePath || !path.isAbsolute(filePath)) return list();
  const updated = load().filter((p) => p !== filePath);
  updated.unshift(filePath);
  const capped = updated.slice(0, MAX_RECENT_FILES);
  save(capped);
  return capped;
}

function clear() {
  save([]);
}

module.exports = { init, add, clear, list, MAX_RECENT_FILES };
