const { BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;

function getMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }
  return null;
}

function sendFileToRenderer(filePath) {
  const win = getMainWindow();
  if (win) {
    win.webContents.send('open-file-argv', filePath);
  }
}

function createWindow(onReadyToShow) {
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

module.exports = { createWindow, getMainWindow, sendFileToRenderer };
