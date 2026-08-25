# Markdown Viewer

A clean, desktop Markdown viewer built with Electron. Open `.md` / `.markdown` / `.txt`
files and preview them with a polished reading layout. Supports KaTeX math, drag & drop,
split view, and **export to PDF / DOCX**.

## Requirements

- **Node.js >= 22.12.0** (the app targets Electron 42, which requires a recent Node)
- **npm** (ships with Node)
- Windows (the build is configured for `nsis`/Windows targets; the dev run works cross-platform)

Check your versions:

```bash
node --version
npm --version
```

## Install dependencies

From the project root (the folder containing `package.json`):

```bash
npm install
```

This installs both runtime dependencies (`marked`, `katex`, `marked-katex-extension`,
`html-to-docx`, `mammoth`) and dev dependencies (`electron`, `electron-builder`).

> If `node_modules` is missing or corrupted, delete it and run `npm install` again:
> ```bash
> rm -rf node_modules package-lock.json
> npm install
> ```

## Run in development

Launch the app directly with Electron (no build step required):

```bash
npm start
```

This runs `electron .` using `main.js` as the entry point. Use this while developing —
any change to `main.js`, `preload.js`, or `src/*` requires restarting `npm start`.

### Using the app

- **Open a file:** click the folder button, press `Ctrl+O`, drag & drop a file, or
  double-click a `.md` file (file association is registered by the installer).
- **Edit:** `Ctrl+E` toggles the editor; `Ctrl+S` saves and re-renders.
- **Split view:** `Ctrl+\` toggles a side-by-side editor + preview.
- **Export:** click the export (up-arrow) button in the title bar → **Export as PDF**
  or **Export as DOCX**. (Also available from the `File` menu.)
- **Diagnostics:** the status bar has a **Logs** button that records every action and
  any export error. Check it if something fails.

> **PDF export note:** exporting works correctly from preview, split, and edit views.
> The PDF is generated from a print of the rendered content. If a PDF export fails,
> the exact error is written to the Logs panel (e.g. `PDF Export Error: …`).

## Build a distributable

Package the app into `dist/` (includes the `win-unpacked` folder and a
`Markdown Viewer Setup 1.0.1.exe` NSIS installer):

```bash
npm run build
```

Output lands in `dist/`. To install, run the generated `Setup *.exe`. To distribute,
share that installer.

If you ever need a completely clean rebuild, remove the old output first:

```bash
rm -rf dist
npm run build
```

> If `dist` cannot be deleted because a process is holding it (common on Windows),
> make sure no running instance of the app / `electron` is open, then retry. A locked
> folder is just the build cache — your `src/` and `main.js` are never touched.

## Project layout

```
markdown-viewer/
├── main.js            # Electron entry point: app lifecycle, single-instance lock
├── main/
│   ├── markdown.js    # marked/KaTeX setup, renderMarkdown(), cleanHtmlForDocx()
│   ├── window.js      # BrowserWindow creation and accessors
│   ├── menu.js        # Application menu
│   └── ipc.js         # All IPC handlers (file IO, PDF/DOCX export, window controls)
├── preload.js         # Context-isolated bridge exposing window.electronAPI
├── src/
│   ├── index.html     # App UI (title bar, content area, export menu)
│   ├── renderer.js    # UI logic, markdown rendering, export triggers
│   ├── style.css      # App styling + print styles used for PDF export
│   └── katex.css      # KaTeX stylesheet for math rendering
├── test/              # Unit tests (node --test)
└── package.json       # Scripts, dependencies, electron-builder config
```

## Lint & tests

```bash
npm run lint   # ESLint over main process, preload, renderer, tests
npm test       # unit tests (node --test), covers markdown rendering + DOCX cleanup
```

## Troubleshooting

- **App won't start / blank window:** ensure `npm install` completed and all
  dependencies resolved. Check the DevTools console (opened automatically in dev).
- **Export button does nothing:** you are likely running a stale build. Rebuild with
  `npm run build` (and reinstall the new Setup), or restart `npm start`.
- **PDF is blank:** open the Logs panel — export prints the rendered content; an error
  there points to the cause (save-dialog cancellation, write permission, etc.).
