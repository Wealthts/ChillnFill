(function () {
    let lastPayload = "";
    let syncing = false;
    let targetPromise = null;
    let beaconTarget = "";
    let syncTimer = 0;

    async function resolveTarget() {
        if (targetPromise) return targetPromise;

        targetPromise = (async () => {
            const origin = String(window.location.origin || "").trim();
            const candidates = Array.from(new Set([
                origin ? `${origin}/api/state/sync` : "",
                "http://localhost:3000/api/state/sync",
                "http://127.0.0.1:3000/api/state/sync"
            ].filter(Boolean)));

            for (const url of candidates) {
                try {
                    const response = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ session: { ping: true } })
                    });
                    if (response.ok) {
                        beaconTarget = url;
                        return url;
                    }
                } catch (error) {
                }
            }

            return "";
        })();

        return targetPromise;
    }

    function read(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
        } catch {
            return fallback;
        }
    }

    function payload() {
        return {
            menus: read("menus", []),
            orders: read("orders", []),
            payments: read("payments", []),
            reviews: read("reviews", []),
            cooks: read("cooks", []),
            session: {
                user_id: localStorage.getItem("user_id") || "",
                table_number: localStorage.getItem("table_number") || "",
                user_type: localStorage.getItem("user_type") || "",
                cook_id: localStorage.getItem("cook_id") || "",
                cook_name: localStorage.getItem("cook_name") || "",
                admin_logged_in: localStorage.getItem("admin_logged_in") || ""
            }
        };
    }

    async function sync(force = false) {
        if (syncing) return;

        const body = JSON.stringify(payload());
        if (!force && body === lastPayload) return;

        syncing = true;
        try {
            const target = await resolveTarget();
            if (!target) return;

            const response = await fetch(target, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body
            });

            if (response.ok) {
                lastPayload = body;
            }
        } catch (error) {
        } finally {
            syncing = false;
        }
    }

    function queueSync(delay = 200, force = false) {
        if (syncTimer) {
            clearTimeout(syncTimer);
        }
        syncTimer = window.setTimeout(() => {
            syncTimer = 0;
            sync(force);
        }, delay);
    }

    function patchStorageMethods() {
        if (!window.localStorage || localStorage.__autosyncPatched) return;

        const originalSetItem = localStorage.setItem.bind(localStorage);
        const originalRemoveItem = localStorage.removeItem.bind(localStorage);
        const originalClear = localStorage.clear.bind(localStorage);

        localStorage.setItem = function patchedSetItem(key, value) {
            const result = originalSetItem(key, value);
            queueSync();
            return result;
        };

        localStorage.removeItem = function patchedRemoveItem(key) {
            const result = originalRemoveItem(key);
            queueSync();
            return result;
        };

        localStorage.clear = function patchedClear() {
            const result = originalClear();
            queueSync(100, true);
            return result;
        };

        Object.defineProperty(localStorage, "__autosyncPatched", {
            value: true,
            configurable: false,
            enumerable: false,
            writable: false
        });
    }

    window.AppAutoSync = {
        sync,
        queueSync
    };

    patchStorageMethods();
    window.addEventListener("storage", () => queueSync());
    window.addEventListener("beforeunload", () => {
        const body = JSON.stringify(payload());
        if (body === lastPayload || !beaconTarget) return;
        try {
            navigator.sendBeacon(beaconTarget, new Blob([body], { type: "application/json" }));
        } catch (error) {
        }
    });

    sync(true);
    setInterval(sync, 4000);
})();
