const { BrowserWindow, dialog, app, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const fileWatcher = require('./watcher');

const windows = new Set();
const dirtyWindows = new WeakSet();
const forceCloseWindows = new WeakSet();
const watchedPaths = new Map();

function getAllWindows() {
  return [...windows].filter((win) => !win.isDestroyed());
}

function getAnyWindow() {
  return getAllWindows()[0] || null;
}

function getFocusedWindow() {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && windows.has(focused) && !focused.isDestroyed()) {
    return focused;
  }
  return null;
}

function setRendererDirty(dirty, win) {
  if (!win || win.isDestroyed()) return;
  if (dirty) {
    dirtyWindows.add(win);
  } else {
    dirtyWindows.delete(win);
  }
}

function isWindowDirty(win) {
  return dirtyWindows.has(win);
}

function confirmDiscardChanges(win) {
  return dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['Discard Changes', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    message: 'You have unsaved changes.',
    detail: 'Your changes will be lost if you continue without saving.',
  }).then(({ response }) => {
    if (response === 0) {
      forceCloseWindows.add(win);
      return true;
    }
    return false;
  });
}

function handleBeforeQuit(event) {
  const dirty = getAllWindows().find((win) => isWindowDirty(win) && !forceCloseWindows.has(win));
  if (!dirty) return;
  event.preventDefault();
  confirmDiscardChanges(dirty).then((proceed) => {
    if (proceed) app.quit();
  });
}

function sendFileToRenderer(filePath) {
  const win = getFocusedWindow() || getAnyWindow();
  if (win) {
    win.webContents.send('open-file-argv', filePath);
  }
  return win || null;
}

function setWindowWatchedFile(win, filePath) {
  if (!win || win.isDestroyed()) return;
  const previous = watchedPaths.get(win);
  if (previous === filePath) return;
  if (previous) fileWatcher.unwatchFile(previous);
  if (!filePath || !path.isAbsolute(filePath) || !fs.existsSync(filePath)) {
    watchedPaths.delete(win);
    return;
  }
  fileWatcher.watchFile(filePath, () => {
    if (win.isDestroyed()) return;
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      win.webContents.send('file-deleted-on-disk', filePath);
      return;
    }
    win.webContents.send('file-changed-on-disk', { filePath, content });
  });
  watchedPaths.set(win, filePath);
}

function nextWindowOptions() {
  const last = getAnyWindow();
  if (!last) {
    return { center: true };
  }
  const bounds = last.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const work = display.workArea;
  let x = bounds.x + 48;
  let y = bounds.y + 48;
  x = Math.min(x, work.x + work.width - Math.min(bounds.width, 400));
  y = Math.min(y, work.y + work.height - Math.min(bounds.height, 200));
  return { x, y, width: bounds.width, height: bounds.height };
}

function createWindow(onReadyToShow) {
  const { center, ...rest } = nextWindowOptions();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: 'hidden',
    frame: false,
    center,
    ...rest,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#FAF8F5',
  });

  windows.add(win);

  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
    if (typeof onReadyToShow === 'function') {
      onReadyToShow();
    }
  });

  win.on('close', (e) => {
    if (!dirtyWindows.has(win) || forceCloseWindows.has(win)) return;
    e.preventDefault();
    confirmDiscardChanges(win).then((proceed) => {
      if (proceed && !win.isDestroyed()) {
        win.close();
      }
    });
  });

  win.on('closed', () => {
    windows.delete(win);
    dirtyWindows.delete(win);
    forceCloseWindows.delete(win);
    const watched = watchedPaths.get(win);
    if (watched) fileWatcher.unwatchFile(watched);
    watchedPaths.delete(win);
  });
}

module.exports = {
  createWindow,
  getAllWindows,
  getAnyWindow,
  getFocusedWindow,
  sendFileToRenderer,
  setRendererDirty,
  setWindowWatchedFile,
  handleBeforeQuit,
};
