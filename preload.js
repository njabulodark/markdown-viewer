const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  renderMarkdown: (md) => ipcRenderer.invoke('render-markdown', md),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', { filePath, content }),
  saveFileAs: (content, sourcePath) => ipcRenderer.invoke('save-file-as', { content, sourcePath }),
  onTriggerOpen: (callback) => {
    ipcRenderer.removeAllListeners('trigger-open-file');
    ipcRenderer.on('trigger-open-file', () => callback());
  },
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  onMaximizedChanged: (callback) => {
    ipcRenderer.removeAllListeners('window-maximized-changed');
    ipcRenderer.on('window-maximized-changed', (_event, isMaximized) => callback(isMaximized));
  },
  closeWindow: () => ipcRenderer.send('window-close'),
  exportPDF: (sourcePath) => ipcRenderer.invoke('export-pdf', sourcePath),
  exportDocx: (markdown, sourcePath) => ipcRenderer.invoke('export-docx', markdown, sourcePath),
  onTriggerExportPDF: (callback) => {
    ipcRenderer.removeAllListeners('trigger-export-pdf');
    ipcRenderer.on('trigger-export-pdf', () => callback());
  },
  onTriggerSaveAs: (callback) => {
    ipcRenderer.removeAllListeners('trigger-save-as');
    ipcRenderer.on('trigger-save-as', () => callback());
  },
  onTriggerExportDocx: (callback) => {
    ipcRenderer.removeAllListeners('trigger-export-docx');
    ipcRenderer.on('trigger-export-docx', () => callback());
  },
  onOpenFileFromArgv: (callback) => {
    ipcRenderer.removeAllListeners('open-file-argv');
    ipcRenderer.on('open-file-argv', (_event, filePath) => callback(filePath));
  },
});
