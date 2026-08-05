// Script de stealth pour les fenêtres d'authentification Google.
// Masque intégralement Electron au niveau JavaScript (navigator.userAgentData, window.chrome, navigator.webdriver).

(function () {
  try {
    // 1. Suppression du drapeau d'automatisation webdriver
    if (typeof navigator !== 'undefined') {
      try {
        delete Object.getPrototypeOf(navigator).webdriver;
      } catch (_) {}
      try {
        delete navigator.webdriver;
      } catch (_) {}
    }

    // 2. Masquage d'Electron dans navigator.userAgentData
    const chromeVer = process.versions.chrome || '131.0.6778.265';
    const majorVer = chromeVer.split('.')[0] || '131';

    const brands = [
      { brand: 'Not_A Brand', version: '99' },
      { brand: 'Chromium', version: majorVer },
      { brand: 'Google Chrome', version: majorVer },
    ];
    const fullList = [
      { brand: 'Not_A Brand', version: '99.0.0.0' },
      { brand: 'Chromium', version: chromeVer },
      { brand: 'Google Chrome', version: chromeVer },
    ];

    const uaData = {
      brands: brands,
      mobile: false,
      platform: 'Windows',
      getHighEntropyValues: function () {
        return Promise.resolve({
          brands: brands,
          mobile: false,
          platform: 'Windows',
          platformVersion: '15.0.0',
          architecture: 'x86',
          bitness: '64',
          model: '',
          wow64: false,
          uaFullVersion: chromeVer,
          fullVersionList: fullList,
        });
      },
      toJSON: function () {
        return { brands: brands, mobile: false, platform: 'Windows' };
      },
    };

    if (typeof Navigator !== 'undefined' && Navigator.prototype) {
      Object.defineProperty(Navigator.prototype, 'userAgentData', {
        get: function () {
          return uaData;
        },
        configurable: true,
        enumerable: true,
      });
    }

    // 3. Emulation de l'objet window.chrome présent dans un vrai Google Chrome Desktop
    if (typeof window !== 'undefined') {
      if (!window.chrome) {
        window.chrome = {};
      }

      if (!window.chrome.csi) {
        window.chrome.csi = function () {
          return {
            startE: Date.now(),
            onloadT: Date.now(),
            pageT: 100,
            tran: 15,
          };
        };
      }

      if (!window.chrome.loadTimes) {
        window.chrome.loadTimes = function () {
          return {
            requestTime: Date.now() / 1000,
            startLoadTime: Date.now() / 1000,
            commitLoadTime: Date.now() / 1000,
            finishDocumentLoadTime: Date.now() / 1000,
            finishLoadTime: Date.now() / 1000,
            firstPaintTime: Date.now() / 1000,
            firstPaintAfterLoadTime: 0,
            navigationType: 'Other',
            wasFetchedViaSpdy: true,
            wasNpnNegotiated: true,
            npnNegotiatedProtocol: 'h2',
            wasAlternateProtocolAvailable: false,
            connectionInfo: 'h2',
          };
        };
      }

      if (!window.chrome.app) {
        window.chrome.app = {
          isInstalled: false,
          InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
          RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
        };
      }

      // Nettoyage de toute propriété résiduelle qui révélerait Electron
      delete window.electron;
      delete window.ipcRenderer;
      delete window.__IS_ELECTRON__;
      delete window.movixDesktop;
    }
  } catch (_) {}
})();
