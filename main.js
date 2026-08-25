const { app } = require('electron');
const path = require('path');
const { createWindow, getMainWindow, sendFileToRenderer, handleBeforeQuit } = require('./main/window');
const { createMenu } = require('./main/menu');
const { registerIpcHandlers } = require('./main/ipc');
const recentFiles = require('./main/recentFiles');

let startupFilePath = null;

function handleStartupFile() {
  if (startupFilePath) {
    sendFileToRenderer(startupFilePath);
    startupFilePath = null;
  }
}

function findMarkdownArg(argv) {
  return argv.find(arg => arg.endsWith('.md') || arg.endsWith('.markdown') || arg.endsWith('.txt'));
}

const gotTheLock = app.requestSingleInstanceLock();
console.log('Single instance lock acquired:', gotTheLock);

if (!gotTheLock) {
  console.log('Quitting because single instance lock was not acquired.');
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const filePath = findMarkdownArg(argv);
    if (filePath) {
      recentFiles.add(filePath);
      createMenu();
      sendFileToRenderer(filePath);
    }
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    recentFiles.init(path.join(app.getPath('userData'), 'recent-files.json'));
    const cliArg = findMarkdownArg(process.argv);
    if (cliArg) {
      startupFilePath = cliArg;
      recentFiles.add(cliArg);
    }
    createWindow(handleStartupFile);
    createMenu();
    registerIpcHandlers();
  });

  app.on('open-file', (_event, filePath) => {
    recentFiles.add(filePath);
    createMenu();
    const win = getMainWindow();
    if (win) {
      sendFileToRenderer(filePath);
      if (win.isMinimized()) win.restore();
      win.focus();
    } else {
      startupFilePath = filePath;
    }
  });

  app.on('before-quit', (event) => {
    handleBeforeQuit(event);
  });

  app.on('will-quit', () => {
    // Force-exit on Windows to kill any lingering GPU/renderer subprocesses
    // that would otherwise hold the single-instance lock file open.
    if (process.platform === 'win32') {
      process.exit(0);
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (!getMainWindow()) {
      createWindow(handleStartupFile);
    }
  });
}
