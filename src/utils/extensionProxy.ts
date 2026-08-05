
import { isElectronApp } from './desktopEnv';

interface ExtensionResponse<T = unknown> {
    source: string;
    messageId: string;
    success: boolean;
    data?: T;
    error?: string;
}

export const isExtensionInstalled = (): boolean => {
    const w = window as Window & {
        hasMovixExtension?: boolean;
        __MOVIX_EXTENSION_INSTALLED?: boolean;
        hasMovixUserscript?: boolean;
    };
    return (
        w.hasMovixExtension === true ||
        w.__MOVIX_EXTENSION_INSTALLED === true ||
        w.hasMovixUserscript === true ||
        document.documentElement?.dataset.movixExtension === 'true'
    );
};

export const isExtensionAvailable = (): boolean => {
    return isExtensionInstalled();
};

export const fetchFromExtension = <T = unknown>(
    action: string,
    payload: Record<string, unknown> = {}
): Promise<T> => {
    return new Promise(async (resolve, reject) => {
        if (!isExtensionAvailable()) {
            return reject(new Error("Extension not available"));
        }

        // In Electron desktop app without extension installed, handle known actions directly
        if (isElectronApp() && !isExtensionInstalled()) {
            if (action === 'PROXY_HTTP' && payload.url) {
                try {
                    const res = await fetch(payload.url as string, {
                        headers: (payload.headers as Record<string, string>) || {}
                    });
                    const text = await res.text();
                    return resolve({ body: text, status: res.status } as T);
                } catch (err) {
                    return reject(err as Error);
                }
            }
            if (action === 'SET_EXTRACTION_PREFS' || action === 'SET_SOURCE_PRIORITY' || action === 'CLEAR_EXTRACTION_CACHE') {
                return resolve({} as T);
            }
            if (action === 'GET_CACHE_STATS' || action === 'GET_STATS') {
                return resolve(null as T);
            }
        }

        const accessKey = window.localStorage.getItem("access_code");
        const enrichedPayload = payload && typeof payload === "object" && !Array.isArray(payload)
            ? { ...payload, ...(accessKey ? { accessKey } : {}) }
            : payload;

        const messageId = Math.random().toString(36).substring(7);

        const handler = (event: MessageEvent<ExtensionResponse<T>>) => {
            const response = event.data;

            // We accept messages from window, must be from extension content script
            if (event.source !== window || !response || response.source !== "MOVIX_EXTENSION") return;

            if (response.messageId === messageId) {
                window.removeEventListener("message", handler);
                if (response.success) {
                    resolve(response.data as T);
                } else {
                    reject(new Error(response.error || "Unknown extension error"));
                }
            }
        };

        window.addEventListener("message", handler);
        window.postMessage({
            source: "MOVIX_WEB",
            type: "EXTENSION_REQUEST",
            action,
            payload: enrichedPayload,
            messageId
        }, "*");

        // Timeout after 10 seconds
        setTimeout(() => {
            window.removeEventListener("message", handler);
            reject(new Error("Extension request timed out"));
        }, 10000);
    });
};

