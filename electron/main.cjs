const { app, BrowserWindow, session, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const { startStaticServer, setAuthReceivedHandler } = require('./static-server.cjs');

// Ensure Single Instance Lock so zombie processes never lock Chromium cache
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// Enable GPU hardware acceleration and direct zero-copy video decoding
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-features', 'IsolateOrigins,site-per-process');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost');

// ---------------------------------------------------------------------------
// Identité navigateur : faire reconnaître l'application comme Chrome Desktop.
// ---------------------------------------------------------------------------
function buildChromeIdentity() {
  const chromeFullVersion = process.versions.chrome || '131.0.6778.265';
  const chromeMajorVersion = chromeFullVersion.split('.')[0] || '131';

  const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeFullVersion} Safari/537.36`;

  return {
    userAgent,
    chromeVersion: chromeMajorVersion,
    secChUa: `"Google Chrome";v="${chromeMajorVersion}", "Chromium";v="${chromeMajorVersion}", "Not?A_Brand";v="99"`,
    secChUaPlatform: '"Windows"',
  };
}

let CHROME_IDENTITY = null;
function chromeIdentity() {
  if (!CHROME_IDENTITY) CHROME_IDENTITY = buildChromeIdentity();
  return CHROME_IDENTITY;
}

let mainWindow = null;

// YouTube & Web Ad Blocker Filter Rules (Ad Server domains only)
const AD_BLOCK_PATTERNS = [
  '*://*.googlesyndication.com/*',
  '*://*.doubleclick.net/*',
  '*://*.googleadservices.com/*',
  '*://*.youtube.com/pagead/*',
];

async function resolveStartUrl() {
  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL;
  }

  const distDir = path.join(__dirname, '..', 'dist');
  try {
    const { url } = await startStaticServer(distDir, 3000);
    setAuthReceivedHandler(() => focusMainWindow());
    return url;
  } catch (_) {
    return 'http://localhost:3000';
  }
}

const configuredSessions = new WeakSet();

function configureSession(targetSession) {
  if (!targetSession || configuredSessions.has(targetSession)) return;
  configuredSessions.add(targetSession);

  const identity = chromeIdentity();
  targetSession.setUserAgent(identity.userAgent);

  targetSession.webRequest.onBeforeRequest({ urls: AD_BLOCK_PATTERNS }, (_details, callback) => {
    callback({ cancel: true });
  });

  // Fast-path bypass for media playback streams (googlevideo.com / videoplayback / live tv HLS)
  targetSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.url.includes('googlevideo.com') || details.url.includes('videoplayback')) {
      return callback({ cancel: false });
    }

    const headers = details.requestHeaders;
    const urlLower = details.url.toLowerCase();

    // Preserve custom User-Agent for Live TV / Vavoo / HLS streams
    const isLiveStream =
      urlLower.includes('/sunshine/') ||
      urlLower.includes('vavoo') ||
      urlLower.includes('ngolpdkyoctjcddxshli469r') ||
      urlLower.includes('.m3u8') ||
      urlLower.includes('.ts') ||
      (headers['User-Agent'] && headers['User-Agent'].includes('VAVOO'));

    if (isLiveStream) {
      if (!headers['User-Agent'] || headers['User-Agent'].includes('Electron')) {
        headers['User-Agent'] = 'VAVOO/2.6';
      }
      return callback({ cancel: false, requestHeaders: headers });
    }

    headers['User-Agent'] = identity.userAgent;
    headers['Sec-CH-UA'] = identity.secChUa;
    headers['Sec-CH-UA-Mobile'] = '?0';
    headers['Sec-CH-UA-Platform'] = identity.secChUaPlatform;
    delete headers['X-Electron'];
    delete headers['X-Requested-With'];

    callback({ cancel: false, requestHeaders: headers });
  });

  targetSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.url.includes('googlevideo.com') || details.url.includes('videoplayback')) {
      return callback({});
    }

    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];

    callback({ responseHeaders });
  });
}

function isGoogleAuth(url) {
  if (!url) return false;
  return /https?:\/\/(accounts\.google\.[a-z.]+|myaccount\.google\.[a-z.]+|consent\.google\.[a-z.]+|passkeys\.google\.[a-z.]+|google\.[a-z.]+\/accounts|accounts\.youtube\.com|passport\.twitch\.tv\/.*google|id\.twitch\.tv\/.*google)/i.test(url);
}

function handleGoogleAuth(url) {
  console.log('[GoogleAuth] Connexion Google -> Ouverture dans le navigateur système :', url);
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    shell.openExternal(url).catch((err) => {
      console.error('[GoogleAuth] Erreur ouverture navigateur système :', err);
    });
  }
}

/**
 * Ouvre une URL dans le navigateur par défaut du système.
 *
 * C'est la voie officielle pour l'autorisation Google d'une application de
 * bureau : Google refuse la connexion dans un navigateur embarqué (page
 * « Impossible de vous connecter »). Restreint à http/https pour ne pas
 * transformer ce pont en lanceur de commandes arbitraires.
 */
function registerExternalOpenBridge() {
  ipcMain.handle('movix:open-external', async (_event, url) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      throw new Error('URL refusée : seuls http et https sont autorisés');
    }
    await shell.openExternal(url);
    return true;
  });

  ipcMain.handle('movix:import-profile-cookies', async (_event, { profileId, rawCookies }) => {
    if (!profileId || typeof profileId !== 'string') {
      return { success: false, error: 'Identifiant de profil invalide' };
    }

    const safeId = profileId.replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
    const partitionName = `persist:movix-hub-${safeId}`;
    const targetSession = session.fromPartition(partitionName);

    let cookiesToSet = [];
    if (typeof rawCookies === 'string') {
      const pairs = rawCookies.split(';');
      for (const pair of pairs) {
        const idx = pair.indexOf('=');
        if (idx > 0) {
          const name = pair.slice(0, idx).trim();
          const value = pair.slice(idx + 1).trim();
          if (name && value) {
            cookiesToSet.push({ name, value });
          }
        }
      }
    } else if (Array.isArray(rawCookies)) {
      cookiesToSet = rawCookies;
    }

    const googleDomains = ['.youtube.com', '.google.com'];
    let count = 0;
    for (const item of cookiesToSet) {
      for (const domain of googleDomains) {
        try {
          await targetSession.cookies.set({
            url: `https://${domain.replace(/^\./, '')}`,
            domain,
            name: item.name,
            value: item.value,
            path: '/',
            secure: true,
            httpOnly: ['SID', 'HSID', 'SSID'].includes(item.name),
            sameSite: 'no_restriction',
            expirationDate: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
          });
          count++;
        } catch (err) {
          // ignore
        }
      }
    }

    await targetSession.cookies.flushStore();
    console.log(`[CookieImport] Importé ${count} cookies dans la partition ${partitionName}`);
    return { success: true, count, partition: partitionName };
  });
}

/** Remet la fenêtre Movix au premier plan dès que le jeton OAuth est revenu. */
function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  configureSession(session.defaultSession);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: true,
    fullscreen: true,
    autoHideMenuBar: true,
    title: 'H-Flix',
    icon: path.join(__dirname, '../public/flix.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enable native <webview> tag for YouTube & Twitch
      webSecurity: false, // Allows webview embedding without X-Frame-Options blocking
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.focus();

  // Tout reste dans l'unique fenêtre Movix : aucune seconde fenêtre ne s'ouvre,
  // mais la navigation demandée est bien effectuée dans la fenêtre principale.
  // (Refuser sans rediriger rendait les sélecteurs de compte Google inopérants.)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      mainWindow.loadURL(url);
    }
    return { action: 'deny' };
  });

  // Les <webview> des tuiles utilisent une partition persistante propre au profil
  // Movix actif (`persist:movix-hub-<id>`, posée par src/components/HubWebView.tsx).
  // Conséquences voulues :
  //  - YouTube et Twitch d'un même profil partagent la même session : une seule
  //    connexion suffit et elle est conservée d'un lancement à l'autre ;
  //  - deux profils Movix ne voient jamais les comptes l'un de l'autre ;
  //  - les traqueurs des lecteurs de films (session par défaut) sont séparés des
  //    sessions Google/Twitch.
  mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    configureSession(webContents.session);
    webContents.setUserAgent(chromeIdentity().userAgent);

    // Auto Skip Ads Script & Stealth for YouTube / Twitch Webview
    // Auto Skip Ads Script & Stealth for YouTube / Twitch Webview
    webContents.on('dom-ready', () => {
      webContents.insertCSS(`
        .video-ads, .ytp-ad-overlay-container, #player-ads, .ytd-ad-slot-renderer {
          display: none !important;
        }
      `);

      webContents.executeJavaScript(`
        try {
          delete Object.getPrototypeOf(navigator).webdriver;
          delete navigator.webdriver;
        } catch (_) {}

        setInterval(() => {
          const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
          if (skipBtn) {
            skipBtn.click();
          }
          const video = document.querySelector('video');
          const adShowing = document.querySelector('.ad-showing, .ytp-ad-self-ad-intent');
          if (adShowing && video && isFinite(video.duration) && video.duration > 0) {
            video.currentTime = video.duration;
          }
          const adOverlay = document.querySelector('.ytp-ad-overlay-close-button');
          if (adOverlay) {
            adOverlay.click();
          }
        }, 300);
      `).catch(() => {});
    });

    webContents.setWindowOpenHandler(({ url }) => {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        webContents.loadURL(url);
      }
      return { action: 'deny' };
    });
  });

  // Charge l'interface Movix (build interne en .exe, serveur Vite en développement)
  resolveStartUrl()
    .then((startUrl) => mainWindow.loadURL(startUrl))
    .catch((error) => showStartupError(error));

  // N'affiche jamais un écran blanc muet : explicite la cause du non-chargement
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // chargement interrompu par une redirection, sans conséquence
    showStartupError(
      new Error(
        `Impossible de charger ${validatedURL}\n${errorDescription} (code ${errorCode})` +
          (app.isPackaged ? '' : '\n\nEn développement, lancez d\'abord : npm run dev')
      )
    );
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showStartupError(error) {
  const message = error && error.message ? error.message : String(error);
  const html = `
    <body style="margin:0;font-family:Segoe UI,sans-serif;background:#0b0b0f;color:#fff;
                 display:flex;align-items:center;justify-content:center;height:100vh">
      <div style="max-width:640px;padding:32px">
        <h1 style="color:#ef4444;font-size:22px;margin:0 0 12px">Movix TV Hub n'a pas pu démarrer</h1>
        <pre style="white-space:pre-wrap;background:#17171f;padding:16px;border-radius:12px;
                    font-size:13px;line-height:1.6;color:#d1d5db">${message
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')}</pre>
      </div>
    </body>`;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  } else {
    dialog.showErrorBox('Movix TV Hub', message);
  }
}

if (gotTheLock) {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Toute session créée par la suite (partition d'un profil Movix) reçoit
  // immédiatement l'identité Chrome, avant son premier chargement de page.
  app.on('session-created', (createdSession) => configureSession(createdSession));

  app.whenReady().then(() => {
    // Agent utilisateur global, désormais dérivé du vrai Chromium embarqué.
    app.userAgentFallback = chromeIdentity().userAgent;

    registerExternalOpenBridge();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
