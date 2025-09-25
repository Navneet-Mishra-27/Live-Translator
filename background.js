let ws = null;
let senderTabId = null;

// Function to initialize WebSocket
function initWebSocket() {
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
    setTimeout(initWebSocket, 3000);
  };

  ws.onerror = (err) => {
    console.error("WS error:", err);
    ws.close();
  };
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "connect") {
    if (sender.tab) {
        senderTabId = sender.tab.id;
    }
    initWebSocket();
    sendResponse({ status: "connection_attempted" });
    return true; // keep channel open
  }

  if (msg.type === "send-audio") {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(msg.data);
    }
  }

  if (msg.type === 'setLanguage' && msg.language) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'setLanguage', language: msg.language }));
      sendResponse({ status: 'language_set' });
    } else {
      sendResponse({ status: 'error', message: 'WebSocket not connected' });
    }
  }
});
