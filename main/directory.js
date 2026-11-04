const fs = require('fs');
const path = require('path');

const MD_EXTENSIONS = new Set(['.md', '.markdown', '.txt']);
const IGNORED_DIRS = new Set(['node_modules']);

function listDirectory(dirPath) {
  const dirents = fs.readdirSync(dirPath, { withFileTypes: true });
  const entries = [];

  for (const dirent of dirents) {
    const name = dirent.name;
    if (name.startsWith('.')) continue;
    const isDir = dirent.isDirectory();
    if (isDir && IGNORED_DIRS.has(name)) continue;

    const fullPath = path.join(dirPath, name);
    if (isDir) {
      entries.push({ name, path: fullPath, isDir: true });
    } else if (MD_EXTENSIONS.has(path.extname(name).toLowerCase())) {
      entries.push({ name, path: fullPath, isDir: false });
    }
  }

  entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return entries;
}

module.exports = { listDirectory, MD_EXTENSIONS };
