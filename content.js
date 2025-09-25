let audioContext = null;
let workletNode = null;
let audioQueue = [];
let isPlaying = false;
let subtitleDiv = null;

// ======= CONNECT TO BACKGROUND WS =======
function connectToBackground() {
  try {
    chrome.runtime.sendMessage({ type: "connect" }, (res) => {
      console.log("Background WS response:", res);
    });
  } catch (e) {
    console.error("Could not connect to background:", e);
    setTimeout(connectToBackground, 1000);
  }
}
connectToBackground();

// Send audio chunks to background
function sendAudioChunk(chunk) {
  chrome.runtime.sendMessage({ type: "send-audio", data: chunk });
}

// Handle messages from backend
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "backend-message") {
    handleBackendMessage(msg.data);
  }
});

// ======= HANDLE BACKEND MESSAGES =======
function handleBackendMessage(data) {
  try {
    const msg = JSON.parse(data);
    if (msg.translatedText && msg.audioData) {
      if (subtitleDiv) {
        subtitleDiv.textContent = msg.translatedText;
      }
      // Add audio to the queue
      const audioBlob = base64toBlob(msg.audioData, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      audioQueue.push(audioUrl);
      playNextAudio();
    }
  } catch (e) {
    console.error("Failed to parse backend message:", e);
  }
}

function playNextAudio() {
  if (isPlaying || audioQueue.length === 0) {
    return;
  }
  isPlaying = true;
  const audioUrl = audioQueue.shift();
  const audio = new Audio(audioUrl);
  audio.play();
  audio.onended = () => {
    isPlaying = false;
    playNextAudio();
  };
}

function base64toBlob(base64Data, contentType) {
    const byteCharacters = atob(base64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, {type: contentType});
}


// ======= CREATE SUBTITLE OVERLAY =======
function createSubtitleOverlay(video) {
  if (document.getElementById("subtitleOverlay")) return;

  const container =
    document.querySelector(".html5-video-player") || video.parentElement;
  if (!container) return;
  container.style.position = "relative";

  subtitleDiv = document.createElement("div");
  subtitleDiv.id = "subtitleOverlay";
  Object.assign(subtitleDiv.style, {
    position: "absolute",
    width: "100%",
    bottom: "15%",
    textAlign: "center",
    color: "yellow",
    fontSize: "28px",
    textShadow: "2px 2px 6px black",
    pointerEvents: "none",
    zIndex: "2147483647",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: "4px 8px",
    borderRadius: "4px",
    userSelect: "none",
    whiteSpace: "nowrap",
  });
  container.appendChild(subtitleDiv);
}

// ======= AUDIO CAPTURE =======
async function captureAudio(video) {
  if (!video.duration || video.duration <= 1) return;
  if (workletNode || (audioContext && audioContext.state !== "closed")) return;

  audioContext = new AudioContext();

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

  const source = audioContext.createMediaElementSource(video);
  workletNode = new AudioWorkletNode(audioContext, "pcm-processor");

  workletNode.port.onmessage = (event) => sendAudioChunk(event.data);

  source.connect(workletNode);
  source.connect(audioContext.destination);

  console.log("Audio capture started");

  video.addEventListener("ended", () => {
    if (workletNode) workletNode.disconnect();
    if (audioContext) audioContext.close();
    audioContext = null;
    workletNode = null;
  });
}

// ======= INITIALIZATION =======
function initializeForCurrentVideo() {
  const video = document.querySelector("video");
  if (!video || video.dataset.hasSubtitleOverlay === "true") return;

  video.dataset.hasSubtitleOverlay = "true";
  createSubtitleOverlay(video);
  captureAudio(video);
}

window.addEventListener("yt-navigate-finish", initializeForCurrentVideo);
window.addEventListener("yt-page-data-updated", initializeForCurrentVideo);
const observer = new MutationObserver(initializeForCurrentVideo);
observer.observe(document.body, { childList: true, subtree: true });

// Initial call
initializeForCurrentVideo();
