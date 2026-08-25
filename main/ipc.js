const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const HTMLtoDOCX = require('html-to-docx');
const { renderMarkdown, cleanHtmlForDocx } = require('./markdown');
const { getMainWindow, setRendererDirty } = require('./window');

function registerIpcHandlers() {
  // Open file dialog
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openFile'],
      filters: [
        { name: 'Markdown Files', extensions: ['md', 'markdown', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePaths.length) return null;

    const filePath = result.filePaths[0];
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { content, filePath };
    } catch (err) {
      throw new Error(`Failed to read file: ${err.message}`, { cause: err });
    }
  });

  // Read file by path
  ipcMain.handle('read-file', async (_event, filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { content, filePath };
    } catch (err) {
      throw new Error(`Failed to read file: ${err.message}`, { cause: err });
    }
  });

  // Drag-and-drop file open
  ipcMain.handle('open-file', async (_event, filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { content, filePath };
    } catch (err) {
      throw new Error(`Failed to read file: ${err.message}`, { cause: err });
    }
  });

  // Render markdown to HTML
  ipcMain.handle('render-markdown', (_event, md) => {
    return renderMarkdown(md);
  });

  // Save file to disk
  ipcMain.handle('save-file', async (_event, { filePath, content }) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (err) {
      throw new Error(`Failed to save file: ${err.message}`, { cause: err });
    }
  });

  // Save file to disk via Save As dialog
  ipcMain.handle('save-file-as', async (_event, { content, sourcePath }) => {
    const win = getMainWindow();
    if (!win) {
      throw new Error('Window not available');
    }
    let defaultPath = 'document.md';
    if (sourcePath && !sourcePath.startsWith('/')) {
      const base = path.basename(sourcePath, path.extname(sourcePath));
      if (path.isAbsolute(sourcePath)) {
        defaultPath = path.join(path.dirname(sourcePath), `${base}.md`);
      } else {
        defaultPath = `${base}.md`;
      }
    }
    // Bring the frameless window to the top so the native Save dialog is not
    // hidden behind it (a known issue on Windows with frame: false windows).
    win.setAlwaysOnTop(true);
    win.focus();
    let result;
    try {
      result = await dialog.showSaveDialog(win, {
        title: 'Save As',
        filters: [
          { name: 'Markdown Files', extensions: ['md', 'markdown', 'txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        defaultPath,
      });
    } finally {
      win.setAlwaysOnTop(false);
    }
    if (result.canceled || !result.filePath) return { success: false, cancelled: true };
    try {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, filePath: result.filePath };
    } catch (err) {
      const message = `Failed to save file: ${err.message}`;
      dialog.showErrorBox('Save Failed', message);
      throw new Error(message, { cause: err });
    }
  });

  // Export to PDF
  ipcMain.handle('export-pdf', async (_event, sourcePath) => {
    const win = getMainWindow();
    if (!win) {
      throw new Error('Window not available');
    }
    let defaultPath = 'document.pdf';
    if (sourcePath && path.isAbsolute(sourcePath)) {
      const dir = path.dirname(sourcePath);
      const base = path.basename(sourcePath, path.extname(sourcePath));
      defaultPath = path.join(dir, `${base}.pdf`);
    }
    // Bring the frameless window to the top so the native Save dialog is not
    // hidden behind it (a known issue on Windows with frame: false windows).
    win.setAlwaysOnTop(true);
    win.focus();
    let result;
    try {
      result = await dialog.showSaveDialog(win, {
        title: 'Export as PDF',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        defaultPath,
      });
    } finally {
      win.setAlwaysOnTop(false);
    }
    if (result.canceled || !result.filePath) return { success: false, cancelled: true };
    try {
      const pdfData = await win.webContents.printToPDF({
        margins: {
          marginType: 'custom',
          top: 0.4,
          bottom: 0.4,
          left: 0.4,
          right: 0.4,
        },
        printBackground: true,
      });
      fs.writeFileSync(result.filePath, pdfData);
      return { success: true, filePath: result.filePath };
    } catch (err) {
      const message = `Failed to export PDF: ${err.message}`;
      dialog.showErrorBox('PDF Export Failed', message);
      throw new Error(message, { cause: err });
    }
  });

  // Export to DOCX
  ipcMain.handle('export-docx', async (_event, markdown, sourcePath) => {
    const win = getMainWindow();
    if (!win) {
      throw new Error('Window not available');
    }
    try {
      const rawHtml = renderMarkdown(markdown || '');
      const cleanedHtml = cleanHtmlForDocx(rawHtml);

      let defaultPath = 'document.docx';
      if (sourcePath && path.isAbsolute(sourcePath)) {
        const dir = path.dirname(sourcePath);
        const base = path.basename(sourcePath, path.extname(sourcePath));
        defaultPath = path.join(dir, `${base}.docx`);
      }
      // Bring the frameless window to the top so the native Save dialog is not
      // hidden behind it (a known issue on Windows with frame: false windows).
      win.setAlwaysOnTop(true);
      win.focus();
      let saveResult;
      try {
        saveResult = await dialog.showSaveDialog(win, {
          title: 'Export as DOCX',
          filters: [{ name: 'Word Document', extensions: ['docx'] }],
          defaultPath,
        });
      } finally {
        win.setAlwaysOnTop(false);
      }
      if (saveResult.canceled || !saveResult.filePath) return { success: false, cancelled: true };

      const docxBuffer = await HTMLtoDOCX(cleanedHtml, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });
      fs.writeFileSync(saveResult.filePath, Buffer.from(docxBuffer));
      return { success: true, filePath: saveResult.filePath };
    } catch (err) {
      const message = `Failed to export DOCX: ${err.message}`;
      dialog.showErrorBox('DOCX Export Failed', message);
      throw new Error(message, { cause: err });
    }
  });

  // Renderer dirty-state reporting
  ipcMain.on('dirty-state-changed', (_event, dirty) => {
    setRendererDirty(dirty);
  });

  // Window controls
  ipcMain.on('window-minimize', () => {
    const win = getMainWindow();
    if (win) win.minimize();
  });

  ipcMain.on('window-maximize', () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
    // Notify renderer of the new state so it can update the icon
    win.webContents.send('window-maximized-changed', win.isMaximized());
  });

  ipcMain.on('window-close', () => {
    const win = getMainWindow();
    if (win) win.close();
  });
}

module.exports = { registerIpcHandlers };
