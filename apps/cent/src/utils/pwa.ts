import { registerSW } from "virtual:pwa-register";

const CHUNK_RELOAD_PREFIX = "cent:chunk-reload:";

const getChunkReloadKey = (payload: unknown) => {
    const message =
        payload instanceof Error
            ? payload.message
            : String(payload ?? "unknown");
    return `${CHUNK_RELOAD_PREFIX}${encodeURIComponent(message.slice(-256))}`;
};

window.addEventListener("vite:preloadError", (event) => {
    if (!navigator.onLine) {
        return;
    }

    const preloadEvent = event as Event & { payload?: unknown };
    const reloadKey = getChunkReloadKey(preloadEvent.payload);

    try {
        if (sessionStorage.getItem(reloadKey)) {
            return;
        }
        sessionStorage.setItem(reloadKey, "1");
    } catch {
        // 无法记录刷新状态时不自动刷新，避免形成刷新循环。
        return;
    }

    preloadEvent.preventDefault();
    if ("serviceWorker" in navigator) {
        void navigator.serviceWorker
            .getRegistration()
            .then((registration) => registration?.update())
            .finally(() => window.location.reload());
    } else {
        window.location.reload();
    }
});

export type UpdateCheckResult = "updated" | "latest" | "unsupported";

// 前台恢复时最多每分钟检查一次
const FOREGROUND_CHECK_INTERVAL = 60 * 1000;
const UPDATE_FOUND_TIMEOUT = 1500;

let registration: ServiceWorkerRegistration | undefined;
let updateSW: ReturnType<typeof registerSW> | undefined;
let lastCheckAt = 0;
let checking: Promise<UpdateCheckResult> | undefined;

const getRegistration = async () => {
    if (!("serviceWorker" in navigator)) {
        return undefined;
    }
    if (!registration) {
        registration =
            (await navigator.serviceWorker.getRegistration()) ?? undefined;
    }
    return registration;
};

const reloadWhenControlled = () => {
    let reloaded = false;
    const reload = () => {
        if (reloaded) {
            return;
        }
        reloaded = true;
        window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", reload, {
        once: true,
    });
    // 少数 iOS 版本激活后不派发 controllerchange，用定时兜底
    window.setTimeout(reload, 2000);
};

/**
 * 让新 SW 跳过等待并接管页面。
 * 若新 SW 仍在安装（iOS 上预缓存可能耗时较久），等安装完成后再激活。
 */
const activateWhenInstalled = (reg: ServiceWorkerRegistration) => {
    if (reg.waiting) {
        reloadWhenControlled();
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
        return;
    }
    const worker = reg.installing;
    if (!worker) {
        return;
    }
    const onStateChange = () => {
        if (worker.state === "redundant") {
            worker.removeEventListener("statechange", onStateChange);
            return;
        }
        if (worker.state !== "installed") {
            return;
        }
        worker.removeEventListener("statechange", onStateChange);
        reloadWhenControlled();
        reg.waiting?.postMessage({ type: "SKIP_WAITING" });
    };
    worker.addEventListener("statechange", onStateChange);
};

const waitForNewWorker = async (
    reg: ServiceWorkerRegistration,
    timeout: number,
) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
        if (reg.waiting || reg.installing) {
            return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
    }
    return Boolean(reg.waiting || reg.installing);
};

export const checkForUpdate = async (): Promise<UpdateCheckResult> => {
    if (checking) {
        return checking;
    }
    checking = (async () => {
        const reg = await getRegistration();
        if (!reg) {
            return "unsupported";
        }
        await reg.update();
        lastCheckAt = Date.now();
        if (!(await waitForNewWorker(reg, UPDATE_FOUND_TIMEOUT))) {
            return "latest";
        }
        activateWhenInstalled(reg);
        return "updated";
    })().finally(() => {
        checking = undefined;
    });
    return checking;
};

const checkIfDue = () => {
    if (document.visibilityState !== "visible" || !navigator.onLine) {
        return;
    }
    if (Date.now() - lastCheckAt < FOREGROUND_CHECK_INTERVAL) {
        return;
    }
    void checkForUpdate().catch(() => undefined);
};

export const registerPWAUpdates = () => {
    updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
            // 等注册函数返回更新句柄后，立即激活新 SW 并刷新页面。
            queueMicrotask(() => {
                void updateSW?.(true);
            });
        },
        onRegisteredSW(_swUrl, reg) {
            registration = reg;
            lastCheckAt = Date.now();
        },
        onRegisterError(error) {
            console.error("Service worker registration failed:", error);
        },
    });

    // iOS 的 PWA 常驻后台时不重新导航，只在回到前台时主动检查更新
    document.addEventListener("visibilitychange", checkIfDue);
    window.addEventListener("focus", checkIfDue);
};
