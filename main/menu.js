const { Menu } = require('electron');
const { getMainWindow } = require('./window');

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            const win = getMainWindow();
            if (win) win.webContents.send('trigger-open-file');
          },
        },
        { type: 'separator' },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            const win = getMainWindow();
            if (win) win.webContents.send('trigger-save-as');
          },
        },
        { type: 'separator' },
        {
          label: 'Export PDF...',
          click: () => {
            const win = getMainWindow();
            if (win) win.webContents.send('trigger-export-pdf');
          },
        },
        {
          label: 'Export DOCX...',
          click: () => {
            const win = getMainWindow();
            if (win) win.webContents.send('trigger-export-docx');
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { createMenu };
