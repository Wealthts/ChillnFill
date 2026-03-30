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

async function loadRealtimeData() {
    try {
        let response;
        try {
            response = await fetch("http://localhost:3000/api/state");
            if (!response.ok) throw new Error("Node API unavailable");
        } catch (error) {
            try {
                response = await fetch("http://127.0.0.1:3000/api/state");
                if (!response.ok) throw new Error("Node API unavailable");
            } catch (nestedError) {
                response = await fetch("http://localhost/restaurant-system/api/get_state.php");
            }
        }
        if (!response.ok) {
            try {
                response = await fetch("http://127.0.0.1/restaurant-system/api/get_state.php");
            } catch (error) {
            }
        }
        if (!response.ok) {
            if (!response.ok) throw new Error("Node API unavailable");
        }
        const payload = await response.json();
        if (!payload.success) throw new Error(payload.message || "Load failed");

        const data = payload.data || {};
        syncStatus.innerText = `Updated ${new Date().toLocaleTimeString()}`;
        realtimeContainer.innerHTML = Object.entries(data).map(([key, item]) => `
            <div class="rounded-3xl border border-[#e6d7c7] bg-[#fbf5ee] p-4 shadow-sm">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <div class="text-lg font-bold text-[#5f4028]">${key}</div>
                    <div class="text-xs text-[#a97a52]">${item.updated_at || "-"}</div>
                </div>
                <pre class="overflow-auto rounded-2xl bg-[#fffaf5] p-3 text-xs text-[#5f4028]">${escapeHtml(JSON.stringify(item.value, null, 2))}</pre>
            </div>
        `).join("") || `<div class="text-center text-[#a97a52]">No synced data yet</div>`;
    } catch (error) {
        realtimeContainer.innerHTML = `<div class="text-center text-[#a97a52]">${escapeHtml(error.message || "Unable to load realtime data")}</div>`;
    }
}

loadRealtimeData();
setInterval(loadRealtimeData, 3000);
