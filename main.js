const { app } = require('electron');
const { createWindow, getMainWindow, sendFileToRenderer } = require('./main/window');
const { createMenu } = require('./main/menu');
const { registerIpcHandlers } = require('./main/ipc');

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
      sendFileToRenderer(filePath);
    }
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    const cliArg = findMarkdownArg(process.argv);
    if (cliArg) {
      startupFilePath = cliArg;
    }
    createWindow(handleStartupFile);
    createMenu();
    registerIpcHandlers();
  });

  app.on('open-file', (_event, filePath) => {
    const win = getMainWindow();
    if (win) {
      sendFileToRenderer(filePath);
      if (win.isMinimized()) win.restore();
      win.focus();
    } else {
      startupFilePath = filePath;
    }
  });

  app.on('before-quit', () => {
    const win = getMainWindow();
    if (win) {
      win.destroy();
    }
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
