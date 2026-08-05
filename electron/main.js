const { app, BrowserWindow, session } = require('electron');
const path = require('path');

// Disable AutomationControlled flag so Google OAuth never detects Electron/automation
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-features', 'IsolateOrigins,site-per-process');
app.commandLine.appendSwitch('disable-site-isolation-trials');

const chromeVer = process.versions.chrome || '131.0.6778.265';
const CHROME_USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;

app.userAgentFallback = CHROME_USER_AGENT;

let mainWindow = null;

function createWindow() {
  // Set default session user agent
  session.defaultSession.setUserAgent(CHROME_USER_AGENT);

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true, // Auto Fullscreen Kiosk Mode for TV Touchscreen
    autoHideMenuBar: true,
    title: 'Movix TV Hub',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enable native <webview> tag for YouTube & Twitch
      webSecurity: false, // Allows webview embedding without X-Frame-Options blocking
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Ensure all web requests send pure Chrome headers
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = CHROME_USER_AGENT;
    delete details.requestHeaders['X-Electron'];
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    responseHeaders['access-control-allow-origin'] = ['*'];
    responseHeaders['access-control-allow-headers'] = ['*'];
    responseHeaders['access-control-allow-methods'] = ['GET, POST, OPTIONS, PUT, DELETE'];
    callback({ responseHeaders });
  });

  // PREVENT MOVIES & SERIES FROM OPENING NEW WINDOWS: Keep everything inside Movix main window!
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('localhost:3000') || url.includes('localhost:25565')) {
      mainWindow.loadURL(url);
    }
    return { action: 'deny' };
  });

  // Handle webview popups inside the webview container
  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    webContents.setUserAgent(CHROME_USER_AGENT);

    webContents.setWindowOpenHandler(({ url }) => {
      webContents.loadURL(url);
      return { action: 'deny' };
    });
  });

  // Load local Vite server (http://localhost:3000)
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
