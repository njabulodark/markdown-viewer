const { Menu } = require('electron');
const fs = require('fs');
const recentFiles = require('./recentFiles');
const { getFocusedWindow, getAnyWindow, createWindow } = require('./window');

function activeWindow() {
  return getFocusedWindow() || getAnyWindow();
}

function sendToActiveWindow(channel) {
  const win = activeWindow();
  if (win) win.webContents.send(channel);
}

function openRecentFile(filePath) {
  const win = activeWindow();
  if (!win) return;
  win.webContents.send('open-file-argv', filePath);
  if (win.isMinimized()) win.restore();
  win.focus();
}

function buildOpenRecentSubmenu() {
  const recents = recentFiles.list();
  return [
    ...recents
      .filter((filePath) => fs.existsSync(filePath))
      .map((filePath) => ({
        label: filePath,
        click: () => openRecentFile(filePath),
      })),
    { type: 'separator' },
    {
      label: 'Clear Recently Opened',
      enabled: recents.length > 0,
      click: () => {
        recentFiles.clear();
        createMenu();
      },
    },
  ];
}

function buildTemplate() {
  return [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow(),
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendToActiveWindow('trigger-open-file'),
        },
        {
          label: 'Open Recent',
          submenu: buildOpenRecentSubmenu(),
        },
        { type: 'separator' },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendToActiveWindow('trigger-save-as'),
        },
        { type: 'separator' },
        {
          label: 'Export PDF...',
          click: () => sendToActiveWindow('trigger-export-pdf'),
        },
        {
          label: 'Export DOCX...',
          click: () => sendToActiveWindow('trigger-export-docx'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
  ];
}

function createMenu() {
  const menu = Menu.buildFromTemplate(buildTemplate());
  Menu.setApplicationMenu(menu);
}

module.exports = { createMenu };
