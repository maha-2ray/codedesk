import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerIpcEventSources, registerIpcHandlers } from './main/ipc-handlers';
import { initStorage } from './main/storage';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

/**
 * Only one instance may run at a time: a second copy of the app during an
 * exam would let a candidate open an unmonitored window, and two processes
 * writing the same attempt snapshot would race.
 */
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    // Avoid a white flash before React mounts; shown on `ready-to-show`.
    show: false,
    backgroundColor: '#0f172a',
    title: 'CodeDesk',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Explicit rather than implicit: these are the settings the exam
      // security model depends on, so make them impossible to lose silently.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload needs Node built-ins for durable storage
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Never let the renderer navigate away from the app, and push any external
  // link to the system browser instead of opening it in an exam window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDevServer =
      MAIN_WINDOW_VITE_DEV_SERVER_URL && url.startsWith(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    if (!isDevServer) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // DevTools in development only; a packaged exam client must not ship them.
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  registerIpcEventSources(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', async () => {
  await initStorage();
  registerIpcHandlers();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
