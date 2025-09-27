let ws = null;
let audioContext = null;
let streamSource = null;
let workletNode = null;
let targetTabId = null;

// Function to start the capture process
async function startCapture(tab) {
  if (targetTabId) {
    console.log('Capture is already active.');
    return;
  }
  targetTabId = tab.id;

  try {
    const stream = await chrome.tabCapture.capture({ audio: true, video: false });
    streamSource = stream;

    initWebSocket(); // Initialize WebSocket connection

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

    chrome.tabs.update(targetTabId, { muted: true });
    chrome.storage.local.set({ isCapturing: true });
    chrome.action.setTitle({ tabId: targetTabId, title: 'Stop Translation' });
    console.log('Tab audio capture started successfully.');

  } catch (error) {
    console.error('Error starting tab capture:', error.message);
    stopCapture(); // Clean up if something goes wrong
  }
}

// Function to stop the capture process
function stopCapture() {
  if (streamSource) {
    streamSource.getTracks().forEach(track => track.stop());
    streamSource = null;
  }
  if (workletNode) {
    workletNode.port.close();
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
  if (targetTabId) {
    chrome.tabs.update(targetTabId, { muted: false });
    chrome.action.setTitle({ tabId: targetTabId, title: 'Start Translation' });
  }
  chrome.storage.local.set({ isCapturing: false });
  targetTabId = null;
  console.log("Audio capture stopped.");
}


// Main logic: Handle clicks on the extension icon
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.get('isCapturing', (data) => {
    if (data.isCapturing) {
      stopCapture();
    } else {
      startCapture(tab);
    }
  });
});


// WebSocket connection logic
function initWebSocket() {
  if (ws && ws.readyState !== WebSocket.CLOSED) {
    return;
  }

  ws = new WebSocket('ws://localhost:3000');

  ws.onopen = () => {
    console.log('WebSocket connected');
    chrome.storage.local.get('targetLanguage', (data) => {
      if (data.targetLanguage) {
        ws.send(JSON.stringify({ type: 'setLanguage', language: data.targetLanguage }));
      }
    });
  };

  ws.onmessage = (event) => {
    if (targetTabId) {
      chrome.tabs.sendMessage(targetTabId, { type: 'backend-message', data: event.data });
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    stopCapture();
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err.message);
    stopCapture();
  };
}
