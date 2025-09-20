let ws;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'connect') {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            ws = new WebSocket("ws://localhost:3000");

            ws.onopen = () => {
                console.log("✅ Background WS connected");
                sendResponse({ status: "connected" });
            };

            ws.onmessage = (event) => {
                chrome.tabs.sendMessage(sender.tab.id, {
                    type: "backend-message",
                    data: event.data
                });
            };

            ws.onclose = () => console.warn("❌ Background WS closed");
            ws.onerror = (err) => console.error("⚠️ Background WS error", err);
        } else {
            sendResponse({ status: "already connected" });
        }
        return true; // keep sendResponse alive
    } else if (msg.type === 'send-audio' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(msg.data);
    }
});
