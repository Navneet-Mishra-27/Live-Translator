let ws = null;
let reconnectTimeout = 3000;

// ======= CONNECT TO BACKEND =======
function connectToServer() {
    ws = new WebSocket("ws://localhost:3000"); // change to your server URL

    ws.onopen = () => {
        console.log("Connected to backend server");
    };

    ws.onmessage = (event) => {
        // Broadcast message to all tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                chrome.tabs.sendMessage(tab.id, { type: "backend-message", data: event.data });
            });
        });
    };

    ws.onclose = () => {
        console.log(`Disconnected from backend, retrying in ${reconnectTimeout / 1000}s...`);
        setTimeout(connectToServer, reconnectTimeout);
    };

    ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
    };
}

// Start initial connection
connectToServer();

// ======= HANDLE MESSAGES FROM CONTENT SCRIPT =======
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "connect") {
        sendResponse({ status: ws?.readyState === 1 ? "connected" : "connecting" });
    } else if (msg.type === "send-audio" && ws?.readyState === 1) {
        ws.send(msg.data);
    }
});
