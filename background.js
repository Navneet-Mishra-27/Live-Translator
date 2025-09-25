let ws = null;
let audioContext = null;
let workletNode = null;
let streamSource = null;

function initWebSocket(tabId) {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    ws = new WebSocket("ws://localhost:3000");

    ws.onopen = () => console.log("WebSocket connected");
    ws.onmessage = (event) => {
        if (tabId) {
            chrome.tabs.sendMessage(tabId, { type: "backend-message", data: event.data });
        }
    };
    ws.onclose = () => {
        console.log("WebSocket disconnected.");
        ws = null;
        stopCapture();
    };
    ws.onerror = (err) => {
        console.error("WS error:", err.message);
        if(ws) ws.close();
    };
}

function stopCapture() {
    if (streamSource) {
        streamSource.getTracks().forEach(track => track.stop());
        streamSource = null;
    }
    if (workletNode) {
        workletNode.disconnect();
        workletNode = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    console.log("Audio capture stopped.");
}

async function startCapture(tabId) {
    initWebSocket(tabId);
    
    try {
        const stream = await chrome.tabCapture.capture({ audio: true });
        streamSource = stream;

        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);

        const processorCode = `
        class PCMProcessor extends AudioWorkletProcessor {
            process(inputs) {
                const input = inputs[0][0];
                if (!input) return true;
                const buffer = new ArrayBuffer(input.length * 2);
                const view = new DataView(buffer);
                for (let i = 0; i < input.length; i++) {
                    let s = Math.max(-1, Math.min(1, input[i]));
                    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
                }
                this.port.postMessage(buffer);
                return true;
            }
        }
        registerProcessor('pcm-processor', PCMProcessor);
        `;
        const blob = new Blob([processorCode], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        await audioContext.audioWorklet.addModule(url);

        workletNode = new AudioWorkletNode(audioContext, "pcm-processor");
        workletNode.port.onmessage = (event) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(event.data);
            }
        };
        source.connect(workletNode);

        console.log("Tab audio capture started successfully.");

    } catch (error) {
        console.error("Error starting tab capture:", error.message);
    }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'startCapture') {
        if (sender.tab && sender.tab.id) {
            startCapture(sender.tab.id);
            sendResponse({ status: "capture_started" });
        }
        return true;
    }
    
    if (msg.type === 'setLanguage' && msg.language) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'setLanguage', language: msg.language }));
            sendResponse({ status: 'language_set' });
        } else {
            sendResponse({ status: 'error', message: 'WebSocket not connected' });
        }
        return true;
    }
});
