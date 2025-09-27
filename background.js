let ws = null;
let audioContext = null;
let streamSource = null;
let workletNode = null;
let targetTabId = null;

function initWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('WebSocket is already open.');
    return;
  }

  console.log('Initializing WebSocket connection...');
  ws = new WebSocket('ws://localhost:3000');

  ws.onopen = () => {
    console.log('WebSocket connected successfully.');
    chrome.storage.local.get('targetLanguage', (data) => {
      if (data.targetLanguage) {
        console.log(`Setting target language to: ${data.targetLanguage}`);
        ws.send(JSON.stringify({ type: 'setLanguage', language: data.targetLanguage }));
      }
    });
  };

  ws.onmessage = (event) => {
    if (targetTabId) {
      chrome.tabs.sendMessage(targetTabid, { type: 'backend-message', data: event.data });
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected.');
    ws = null;
    stopCapture();
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err.message);
    if (ws) {
      ws.close();
    }
  };
}

async function startCapture(tabId) {
  targetTabId = tabId;
  initWebSocket();

  try {
    if (!chrome.tabCapture || typeof chrome.tabCapture.capture !== 'function') {
      console.error('chrome.tabCapture.capture is not available. Ensure the "tabCapture" permission is in manifest.json and this is run from a user gesture.');
      return;
    }

    console.log('Starting tab capture...');
    const stream = await chrome.tabCapture.capture({ audio: true, video: false });
    streamSource = stream;

    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);

    await audioContext.audioWorklet.addModule('audio-processor.js');

    workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
    workletNode.port.onmessage = (event) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(event.data);
      }
    };
    source.connect(workletNode);
    console.log('Tab audio capture started successfully.');
  } catch (error) {
    console.error('Error starting tab capture:', error.message);
    stopCapture();
  }
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
  if (ws) {
    ws.close();
    ws = null;
  }
  targetTabId = null;
  chrome.storage.local.set({ isCapturing: false });
  console.log("Audio capture stopped.");
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'startCapture') {
    startCapture(msg.tabId);
  } else if (msg.type === 'stopCapture') {
    stopCapture();
  } else if (msg.type === 'setLanguage') {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'setLanguage', language: msg.language }));
    }
  }
});
