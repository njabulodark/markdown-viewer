const welcomeScreen = document.getElementById('welcome-screen');
const markdownContent = document.getElementById('markdown-content');
const markdownEditor = document.getElementById('markdown-editor');
const splitPane = document.getElementById('split-pane');
const markdownEditorSplit = document.getElementById('markdown-editor-split');
const markdownContentSplit = document.getElementById('markdown-content-split');
const fileBreadcrumb = document.getElementById('file-breadcrumb');
const statusText = document.getElementById('status-text');
const wordCountEl = document.getElementById('word-count');
const dropOverlay = document.getElementById('drop-overlay');
const btnOpen = document.getElementById('btn-open');
const btnEdit = document.getElementById('btn-edit');
const btnSave = document.getElementById('btn-save');
const btnSplit = document.getElementById('btn-split');
const fontControls = document.getElementById('font-controls');
const btnFontUp = document.getElementById('btn-font-up');
const btnFontDown = document.getElementById('btn-font-down');
const fontSizeLabel = document.getElementById('font-size-label');
const btnOpenWelcome = document.getElementById('btn-open-welcome');
const exportDropdown = document.getElementById('export-dropdown');
const exportBtn = document.getElementById('btn-export');
const exportMenu = document.getElementById('export-menu');
const exportPdfBtn = document.getElementById('export-pdf');
const exportDocxBtn = document.getElementById('export-docx');

const logPanel = document.getElementById('log-panel');
const logEntries = document.getElementById('log-entries');
const logCountEl = document.getElementById('log-count');
const btnToggleLogs = document.getElementById('btn-toggle-logs');
const btnCopyLogs = document.getElementById('btn-copy-logs');
const btnClearLogs = document.getElementById('btn-clear-logs');
const btnCloseLogs = document.getElementById('btn-close-logs');

let currentFilePath = null;
let currentFileName = '';
let isDirty = false;
let currentContent = '';
let lastSavedContent = '';
let isEditMode = false;
let isSplitView = false;
let previewFontSize = 16;
let exportMenuOpen = false;
let logs = [];

function addLog(msg, type = 'info') {
  const now = new Date();
  const timestamp = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
  logs.push({ timestamp, msg, type });

  if (type === 'error') {
    btnToggleLogs.classList.add('has-error');
  }

  logCountEl.textContent = logs.length;

  const entryEl = document.createElement('div');
  entryEl.className = `log-entry ${type}`;
  entryEl.innerHTML = `<span class="log-time">[${timestamp}]</span><span class="log-msg">${escapeHtml(msg)}</span>`;
  logEntries.appendChild(entryEl);
  logEntries.scrollTop = logEntries.scrollHeight;

  statusText.textContent = msg;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function computeDirty() {
  return getLatestContent() !== lastSavedContent;
}

function updateDirtyIndicator() {
  const dirty = computeDirty();
  if (dirty !== isDirty) {
    isDirty = dirty;
    window.electronAPI.notifyDirtyState(dirty);
  }
  fileBreadcrumb.textContent = currentFileName ? `${currentFileName}${dirty ? ' •' : ''}` : '';
  fileBreadcrumb.title = currentFilePath || (currentFileName || '');
}

async function confirmIfDirty(actionLabel) {
  if (!isDirty) return true;
  const proceed = window.confirm(`You have unsaved changes.\n\n${actionLabel} anyway?`);
  if (!proceed) addLog(`${actionLabel} cancelled (unsaved changes)`, 'info');
  return proceed;
}

function isAbsoluteFsPath(p) {
  return typeof p === 'string' && (p.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(p));
}

function updateWatchedFile() {
  window.electronAPI.setWatchedFile(isAbsoluteFsPath(currentFilePath) ? currentFilePath : null);
}

function toggleLogPanel() {
  logPanel.classList.toggle('hidden');
}

btnToggleLogs.addEventListener('click', toggleLogPanel);
statusText.addEventListener('click', toggleLogPanel);
statusText.style.cursor = 'pointer';
btnCloseLogs.addEventListener('click', () => logPanel.classList.add('hidden'));

btnClearLogs.addEventListener('click', () => {
  logs = [];
  logEntries.innerHTML = '';
  logCountEl.textContent = '0';
  btnToggleLogs.classList.remove('has-error');
});

btnCopyLogs.addEventListener('click', () => {
  const text = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.msg}`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    addLog('Logs copied to clipboard', 'success');
  }).catch(err => {
    addLog(`Copy failed: ${err.message}`, 'error');
  });
});

// Window controls - use mousedown to prevent drag interference
function setupWinBtn(id, action) {
  const btn = document.getElementById(id);
  btn.style.webkitAppRegion = 'no-drag';
  btn.addEventListener('mousedown', (e) => e.stopPropagation());
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    action();
  });
}

setupWinBtn('btn-minimize', () => window.electronAPI.minimizeWindow());
const btnMaximize = document.getElementById('btn-maximize');
setupWinBtn('btn-maximize', () => window.electronAPI.maximizeWindow());

window.electronAPI.onMaximizedChanged((isMaximized) => {
  if (isMaximized) {
    btnMaximize.classList.add('maximized');
    btnMaximize.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1.5" y="2.5" width="7" height="6" fill="none" stroke="currentColor" stroke-width="1"/><line x1="3.5" y1="1.5" x2="8.5" y2="1.5" stroke="currentColor" stroke-width="1"/></svg>';
  } else {
    btnMaximize.classList.remove('maximized');
    btnMaximize.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  }
});
setupWinBtn('btn-close', () => window.electronAPI.closeWindow());

async function openFile() {
  if (!(await confirmIfDirty('Open a different file'))) return;
  try {
    const result = await window.electronAPI.openFileDialog();
    if (result) {
      addLog(`File dialog selected: ${result.filePath}`, 'info');
      renderMarkdown(result.content, result.filePath);
    }
  } catch (err) {
    addLog(`Open File Error: ${err.message}`, 'error');
  }
}

async function renderMarkdown(content, filePath) {
  try {
    const html = await window.electronAPI.renderMarkdown(content);

    welcomeScreen.classList.add('hidden');

    if (isSplitView) {
      markdownEditorSplit.value = content;
      markdownContentSplit.innerHTML = html;
      wrapTables(markdownContentSplit);
      splitPane.classList.remove('hidden');
      markdownContent.classList.add('hidden');
      markdownEditor.classList.add('hidden');
    } else {
      markdownContent.innerHTML = html;
      wrapTables(markdownContent);
      markdownContent.classList.remove('hidden');
      markdownEditor.classList.add('hidden');
      splitPane.classList.add('hidden');
    }

    currentFileName = filePath.split(/[\\/]/).pop();

    updateWordCount(content);

    addLog(`Opened: ${currentFileName}`, 'success');
    document.getElementById('content-area').scrollTop = 0;

    if (filePath && filePath.startsWith('/')) {
      currentFilePath = null;
      currentContent = content;
      btnEdit.classList.add('hidden');
      btnSave.classList.add('hidden');
      btnSplit.classList.add('hidden');
      fontControls.classList.add('hidden');
      exportDropdown.classList.add('hidden');
    } else {
      currentFilePath = filePath || null;
      currentContent = content;
      btnEdit.classList.remove('hidden');
      btnSave.classList.add('hidden');
      btnSplit.classList.remove('hidden');
      fontControls.classList.remove('hidden');
      exportDropdown.classList.remove('hidden');
    }

    if (isEditMode) {
      exitEditMode();
    }

    lastSavedContent = content;
    updateDirtyIndicator();
    updateWatchedFile();
  } catch (err) {
    statusText.textContent = `Error rendering: ${err.message}`;
  }
}

function wrapTables(container) {
  container.querySelectorAll('table').forEach(table => {
    const wrapper = document.createElement('div');
    wrapper.style.overflowX = 'auto';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

function updateWordCount(content) {
  const words = content.trim().split(/\s+/).length;
  const lines = content.split('\n').length;
  wordCountEl.textContent = `${words} words · ${lines} lines`;
}

let dragCounter = 0;

document.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  dropOverlay.classList.remove('hidden');
});

document.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0) {
    dropOverlay.classList.add('hidden');
  }
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

document.addEventListener('drop', async (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.add('hidden');

  if (!(await confirmIfDirty('Open the dropped file'))) return;

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const content = ev.target.result;
        renderMarkdown(content, file.name);
      } catch (err) {
        statusText.textContent = `Error: ${err.message}`;
      }
    };
    reader.readAsText(file);
  }
});

function enterEditMode() {
  if (!currentFilePath && !currentContent) return;
  isEditMode = true;
  markdownEditor.value = currentContent;
  markdownContent.classList.add('hidden');
  splitPane.classList.add('hidden');
  markdownEditor.classList.remove('hidden');
  btnEdit.classList.add('hidden');
  btnSave.classList.remove('hidden');
  statusText.textContent = 'Editing...';
  document.getElementById('content-area').scrollTop = 0;
}

function exitEditMode() {
  isEditMode = false;
  if (isSplitView) {
    splitPane.classList.remove('hidden');
  } else {
    markdownContent.classList.remove('hidden');
  }
  markdownEditor.classList.add('hidden');
  btnEdit.classList.remove('hidden');
  btnSave.classList.add('hidden');
}

function toggleExportMenu() {
  exportMenuOpen = !exportMenuOpen;
  exportMenu.classList.toggle('hidden', !exportMenuOpen);
}

function closeExportMenu() {
  if (exportMenuOpen) {
    exportMenuOpen = false;
    exportMenu.classList.add('hidden');
  }
}

function getLatestContent() {
  if (isSplitView) {
    return markdownEditorSplit.value;
  }
  if (isEditMode) {
    return markdownEditor.value;
  }
  return currentContent;
}

async function exportPDF() {
  const content = getLatestContent();
  if (!content) {
    addLog('Nothing to export', 'info');
    return;
  }
  closeExportMenu();
  addLog('Exporting PDF...', 'info');
  try {
    const html = await window.electronAPI.renderMarkdown(content);
    markdownContent.innerHTML = html;
    wrapTables(markdownContent);

    // Make the canonical content the only visible pane so the PDF is not
    // blank or duplicated when exporting from split/edit view.
    const restoreSplit = !splitPane.classList.contains('hidden');
    const restoreEditor = !markdownEditor.classList.contains('hidden');
    welcomeScreen.classList.add('hidden');
    splitPane.classList.add('hidden');
    markdownEditor.classList.add('hidden');
    markdownContent.classList.remove('hidden');

    const result = await window.electronAPI.exportPDF(currentFilePath);

    if (restoreSplit) splitPane.classList.remove('hidden');
    if (restoreEditor) markdownEditor.classList.remove('hidden');
    if (!restoreSplit && !restoreEditor) markdownContent.classList.remove('hidden');

    if (result.success) {
      const fileName = result.filePath.split(/[\\/]/).pop();
      addLog(`Exported PDF: ${fileName} (${result.filePath})`, 'success');
    } else if (result.cancelled) {
      addLog('PDF export cancelled by user', 'info');
    }
  } catch (err) {
    addLog(`PDF Export Error: ${err.message}`, 'error');
  }
}

async function exportDocx() {
  const content = getLatestContent();
  if (!content) {
    addLog('Nothing to export', 'info');
    return;
  }
  closeExportMenu();
  addLog('Exporting DOCX...', 'info');
  try {
    const result = await window.electronAPI.exportDocx(content, currentFilePath);
    if (result.success) {
      const fileName = result.filePath.split(/[\\/]/).pop();
      addLog(`Exported DOCX: ${fileName} (${result.filePath})`, 'success');
    } else if (result.cancelled) {
      addLog('DOCX export cancelled by user', 'info');
    }
  } catch (err) {
    addLog(`DOCX Export Error: ${err.message}`, 'error');
  }
}

async function saveAndRender() {
  const editedContent = isSplitView ? markdownEditorSplit.value : markdownEditor.value;
  currentContent = editedContent;

  if (currentFilePath) {
    try {
      await window.electronAPI.saveFile(currentFilePath, editedContent);
      statusText.textContent = 'Saved';
    } catch (err) {
      statusText.textContent = `Save error: ${err.message}`;
      return;
    }
  }

  const html = await window.electronAPI.renderMarkdown(editedContent);

  if (isSplitView) {
    markdownContentSplit.innerHTML = html;
    wrapTables(markdownContentSplit);
  } else {
    markdownContent.innerHTML = html;
    wrapTables(markdownContent);
    exitEditMode();
  }

  updateWordCount(editedContent);
  lastSavedContent = editedContent;
  updateDirtyIndicator();
  document.getElementById('content-area').scrollTop = 0;
}

async function saveAs() {
  const content = getLatestContent();
  if (!content) {
    addLog('Nothing to save', 'info');
    return;
  }
  closeExportMenu();
  try {
    const result = await window.electronAPI.saveFileAs(content, currentFilePath);
    if (result.success) {
      currentFilePath = result.filePath;
      currentContent = content;
      lastSavedContent = content;
      currentFileName = result.filePath.split(/[\\/]/).pop();
      updateDirtyIndicator();
      btnEdit.classList.remove('hidden');
      btnSplit.classList.remove('hidden');
      fontControls.classList.remove('hidden');
      exportDropdown.classList.remove('hidden');
      statusText.textContent = `Saved: ${currentFileName}`;
      addLog(`Saved As: ${currentFileName} (${result.filePath})`, 'success');
      window.electronAPI.addRecentFile(result.filePath);
      updateWatchedFile();
    } else if (result.cancelled) {
      addLog('Save As cancelled', 'info');
    }
  } catch (err) {
    addLog(`Save As Error: ${err.message}`, 'error');
  }
}

async function toggleSplitView() {
  isSplitView = !isSplitView;
  btnSplit.classList.toggle('active', isSplitView);

  if (isSplitView) {
    markdownEditorSplit.value = currentContent;
    const html = await window.electronAPI.renderMarkdown(currentContent);
    markdownContentSplit.innerHTML = html;
    wrapTables(markdownContentSplit);
    splitPane.classList.remove('hidden');
    markdownContent.classList.add('hidden');
    markdownEditor.classList.add('hidden');
    btnEdit.classList.add('hidden');
    btnSave.classList.remove('hidden');
    statusText.textContent = 'Split view';
  } else {
    splitPane.classList.add('hidden');
    if (isEditMode) {
      markdownEditor.classList.remove('hidden');
    } else {
      const html = await window.electronAPI.renderMarkdown(currentContent);
      markdownContent.innerHTML = html;
      wrapTables(markdownContent);
      markdownContent.classList.remove('hidden');
    }
    btnEdit.classList.remove('hidden');
    btnSave.classList.add('hidden');
    statusText.textContent = 'Preview';
  }
}

let splitPreviewTimeout = null;

async function updateSplitPreview() {
  if (!isSplitView) return;
  const content = markdownEditorSplit.value;
  currentContent = content;
  updateDirtyIndicator();

  if (splitPreviewTimeout) clearTimeout(splitPreviewTimeout);
  splitPreviewTimeout = setTimeout(async () => {
    try {
      const html = await window.electronAPI.renderMarkdown(content);
      markdownContentSplit.innerHTML = html;
      wrapTables(markdownContentSplit);
      updateWordCount(content);
    } catch (err) {
      statusText.textContent = `Render error: ${err.message}`;
    }
  }, 300);
}

function setFontSize(size) {
  previewFontSize = Math.max(10, Math.min(32, size));
  fontSizeLabel.textContent = `${previewFontSize}px`;
  markdownContent.style.fontSize = `${previewFontSize}px`;
  markdownContentSplit.style.fontSize = `${previewFontSize}px`;
}

const splitDivider = document.querySelector('.split-divider');
let isDraggingDivider = false;

splitDivider.addEventListener('mousedown', (e) => {
  isDraggingDivider = true;
  splitDivider.classList.add('dragging');
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isDraggingDivider) return;
  const paneRect = splitPane.getBoundingClientRect();
  const offsetX = e.clientX - paneRect.left;
  const pct = Math.max(20, Math.min(80, (offsetX / paneRect.width) * 100));
  markdownEditorSplit.style.flex = `${pct}`;
  markdownContentSplit.style.flex = `${100 - pct}`;
});

document.addEventListener('mouseup', () => {
  if (isDraggingDivider) {
    isDraggingDivider = false;
    splitDivider.classList.remove('dragging');
  }
});

btnOpen.addEventListener('mousedown', (e) => e.stopPropagation());
btnOpen.addEventListener('click', openFile);
btnEdit.addEventListener('click', enterEditMode);
btnSave.addEventListener('click', saveAndRender);
btnSplit.addEventListener('click', toggleSplitView);
btnFontUp.addEventListener('click', () => setFontSize(previewFontSize + 1));
btnFontDown.addEventListener('click', () => setFontSize(previewFontSize - 1));
btnOpenWelcome.addEventListener('click', openFile);

exportBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleExportMenu();
});
exportPdfBtn.addEventListener('click', exportPDF);
exportDocxBtn.addEventListener('click', exportDocx);

document.addEventListener('click', (e) => {
  if (!exportDropdown.contains(e.target)) {
    closeExportMenu();
  }
});

markdownEditorSplit.addEventListener('input', updateSplitPreview);

markdownEditor.addEventListener('input', () => {
  statusText.textContent = 'Editing...';
  updateDirtyIndicator();
});

window.electronAPI.onTriggerOpen(openFile);
window.electronAPI.onTriggerSaveAs(saveAs);
window.electronAPI.onTriggerExportPDF(exportPDF);
window.electronAPI.onTriggerExportDocx(exportDocx);

window.electronAPI.onOpenFileFromArgv(async (filePath) => {
  if (!(await confirmIfDirty('Open the requested file'))) return;
  try {
    const result = await window.electronAPI.readFile(filePath);
    if (result) {
      renderMarkdown(result.content, result.filePath);
    }
  } catch (err) {
    statusText.textContent = `Error: ${err.message}`;
  }
});

window.electronAPI.onFileChangedOnDisk(async ({ filePath, content }) => {
  if (filePath !== currentFilePath) return;
  if (content === currentContent || content === lastSavedContent) return;
  if (computeDirty()) {
    statusText.textContent = 'File changed on disk — your unsaved edits are kept';
    addLog(`External change detected while editing: ${currentFileName}`, 'info');
    return;
  }
  try {
    await renderMarkdown(content, filePath);
    statusText.textContent = 'Reloaded from disk';
    addLog(`Reloaded from disk: ${currentFileName}`, 'info');
  } catch (err) {
    addLog(`Reload error: ${err.message}`, 'error');
  }
});

window.electronAPI.onFileDeletedOnDisk((filePath) => {
  if (filePath !== currentFilePath) return;
  updateWatchedFile();
  statusText.textContent = `${currentFileName} was deleted or moved on disk`;
  addLog(`File missing on disk: ${filePath}`, 'error');
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    openFile();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    if (!isEditMode) enterEditMode();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (isEditMode || isSplitView) saveAndRender();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
    e.preventDefault();
    toggleSplitView();
  }
});
