// Pont entre le processus Electron et l'application React.
const { contextBridge, ipcRenderer } = require('electron');

// Alignement de navigator.userAgentData et suppression de navigator.webdriver
// pour éviter que Google ne détecte Electron/automation lors de la connexion.
try {
  if (typeof window !== 'undefined') {
    try {
      delete Object.getPrototypeOf(navigator).webdriver;
    } catch (_) {}

    const chromeVer = process.versions.chrome || "131.0.0.0";
    const majorVer = chromeVer.split(".")[0] || "131";

    const brands = [
      { brand: "Not_A Brand", version: "99" },
      { brand: "Chromium", version: majorVer },
      { brand: "Google Chrome", version: majorVer }
    ];
    const fullList = [
      { brand: "Not_A Brand", version: "99.0.0.0" },
      { brand: "Chromium", version: chromeVer },
      { brand: "Google Chrome", version: chromeVer }
    ];

    const data = {
      brands: brands,
      mobile: false,
      platform: "Windows",
      getHighEntropyValues: function() {
        return Promise.resolve({
          brands: brands,
          mobile: false,
          platform: "Windows",
          platformVersion: "15.0.0",
          architecture: "x86",
          bitness: "64",
          model: "",
          wow64: false,
          uaFullVersion: chromeVer,
          fullVersionList: fullList
        });
      },
      toJSON: function() {
        return { brands: brands, mobile: false, platform: "Windows" };
      }
    };

    Object.defineProperty(Navigator.prototype, "userAgentData", {
      get: function() { return data; },
      configurable: true
    });
  }
} catch (_) {}

try {
  const isLocalApp = typeof window !== 'undefined' && (
    window.location.protocol === 'file:' || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'chrome-extension:'
  );

  if (isLocalApp) {
    // Drapeau attendu par YouTubeHubPage.tsx / TwitchHubPage.tsx
    contextBridge.exposeInMainWorld('__IS_ELECTRON__', true);

    contextBridge.exposeInMainWorld('movixDesktop', {
      isElectron: true,
      platform: process.platform,
      openExternal: (url) => ipcRenderer.invoke('movix:open-external', url),
      importProfileCookies: (data) => ipcRenderer.invoke('movix:import-profile-cookies', data),
    });
  }
} catch (error) {
  console.error('[preload] Exposition du pont Electron impossible :', error);
}
