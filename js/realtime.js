const realtimeContainer = document.getElementById("realtimeContainer");
const syncStatus = document.getElementById("syncStatus");

function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function fetchRealtimePayload() {
    const urls = [
        "http://localhost:3000/api/state",
        "http://127.0.0.1:3000/api/state",
        "http://localhost/restaurant-system/api/get_state.php",
        "http://127.0.0.1/restaurant-system/api/get_state.php"
    ];

    let lastError = new Error("Unable to connect to realtime API");
    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                lastError = new Error(`Request failed with status ${response.status}`);
                continue;
            }
            return await response.json();
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

function renderStateCards(data) {
    return Object.entries(data).map(([key, item]) => `
        <div class="rounded-3xl border border-[#e6d7c7] bg-[#fbf5ee] p-4 shadow-sm">
            <div class="flex items-center justify-between gap-3 mb-3">
                <div class="text-lg font-bold text-[#5f4028]">${escapeHtml(key)}</div>
                <div class="text-xs text-[#a97a52]">${escapeHtml(item.updated_at || "-")}</div>
            </div>
            <pre class="overflow-auto rounded-2xl bg-[#fffaf5] p-3 text-xs text-[#5f4028]">${escapeHtml(JSON.stringify(item.value, null, 2))}</pre>
        </div>
    `).join("");
}

function renderMirrorCards(mirrors) {
    return Object.entries(mirrors).map(([table, info]) => `
        <div class="rounded-3xl border border-[#d7b58f] bg-[#fff4e8] p-4 shadow-sm">
            <div class="flex items-center justify-between gap-3 mb-3">
                <div class="text-lg font-bold text-[#7a4e2f]">${escapeHtml(table)}</div>
                <div class="text-xs text-[#a97a52]">Rows: ${escapeHtml(info.count)}</div>
            </div>
            <div class="text-xs text-[#a97a52] mb-2">Last updated: ${escapeHtml(info.last_updated || "-")}</div>
            <pre class="overflow-auto rounded-2xl bg-[#fffaf5] p-3 text-xs text-[#5f4028]">${escapeHtml(JSON.stringify(info.latest_rows || [], null, 2))}</pre>
        </div>
    `).join("");
}

async function loadRealtimeData() {
    try {
        const payload = await fetchRealtimePayload();
        if (!payload.success) throw new Error(payload.message || "Load failed");

        const data = payload.data || {};
        const mirrors = payload.mirrors || {};
        const sections = [];

        if (Object.keys(mirrors).length) {
            sections.push(renderMirrorCards(mirrors));
        }
        if (Object.keys(data).length) {
            sections.push(renderStateCards(data));
        }

        syncStatus.innerText = `Updated ${new Date().toLocaleTimeString()}`;
        realtimeContainer.innerHTML = sections.join("") || `<div class="text-center text-[#a97a52]">No synced data yet</div>`;
    } catch (error) {
        realtimeContainer.innerHTML = `<div class="text-center text-[#a97a52]">${escapeHtml(error.message || "Unable to load realtime data")}</div>`;
    }
}

loadRealtimeData();
setInterval(loadRealtimeData, 3000);
