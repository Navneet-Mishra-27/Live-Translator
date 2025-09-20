let ws = null;

// Function to initialize WebSocket
function initWebSocket(senderTabId) {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    ws = new WebSocket("ws://localhost:3000");

    ws.onopen = () => {
        console.log("WebSocket connected");
        if (senderTabId) {
            chrome.tabs.sendMessage(senderTabId, { type: "backend-message", data: JSON.stringify({ text: "WS connected" }) });
        }
    };

    ws.onmessage = (event) => {
        // Broadcast to the tab that requested connection
        if (senderTabId) {
            chrome.tabs.sendMessage(senderTabId, { type: "backend-message", data: event.data });
        }
    };

    ws.onclose = () => {
        console.log("WebSocket disconnected, retrying in 3s...");
        ws = null;
        setTimeout(() => initWebSocket(senderTabId), 3000);
    };

    ws.onerror = (err) => {
        console.error("WS error:", err);
        ws.close();
    };
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!sender.tab) return; // ignore messages not from tabs

    const tabId = sender.tab.id;

    if (msg.type === "connect") {
        initWebSocket(tabId);
        sendResponse({ status: "connection_attempted" });
        return true; // keep channel open
    }

    if (msg.type === "send-audio") {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(msg.data);
        }
    }
});
