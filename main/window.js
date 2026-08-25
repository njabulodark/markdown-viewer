const { BrowserWindow, dialog, app } = require('electron');
const path = require('path');

let mainWindow = null;
let rendererDirty = false;
let forceClose = false;

function getMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }
  return null;
}

function setRendererDirty(dirty) {
  rendererDirty = !!dirty;
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
      forceClose = true;
      return true;
    }
    return false;
  });
}

function handleBeforeQuit(event) {
  const win = getMainWindow();
  if (!win || !rendererDirty || forceClose) return;
  event.preventDefault();
  confirmDiscardChanges(win).then((proceed) => {
    if (proceed) app.quit();
  });
}

function sendFileToRenderer(filePath) {
  const win = getMainWindow();
  if (win) {
    win.webContents.send('open-file-argv', filePath);
  }
}

function createWindow(onReadyToShow) {
  forceClose = false;
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: 'hidden',
    frame: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#FAF8F5',
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    if (typeof onReadyToShow === 'function') {
      onReadyToShow();
    }
  });

  mainWindow.on('close', (e) => {
    if (!rendererDirty || forceClose) return;
    e.preventDefault();
    confirmDiscardChanges(mainWindow).then((proceed) => {
      if (proceed && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

module.exports = { createWindow, getMainWindow, sendFileToRenderer, setRendererDirty, handleBeforeQuit };
