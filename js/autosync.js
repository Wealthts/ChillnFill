(function () {
    let lastPayload = "";
    let syncing = false;
    let targetPromise = null;
    let beaconTarget = "";

    async function resolveTarget() {
        if (targetPromise) return targetPromise;
        targetPromise = (async () => {
            const candidates = [
                "http://localhost:3000/api/state/sync",
                "http://127.0.0.1:3000/api/state/sync",
                "http://localhost/restaurant-system/api/sync_state.php",
                "http://127.0.0.1/restaurant-system/api/sync_state.php"
            ];

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

    function payload() {
        const read = (key, fallback) => {
            try {
                return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
            } catch {
                return fallback;
            }
        };

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
            await fetch(target, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body
            });
            lastPayload = body;
        } catch (error) {
        } finally {
            syncing = false;
        }
    }

    window.AppAutoSync = { sync };

    window.addEventListener("storage", () => sync());
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
