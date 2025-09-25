let audioContext = null;
let workletNode = null;
let audioQueue = [];
let isPlaying = false;
let subtitleDiv = null;

// ======= CONNECT TO BACKGROUND WS =======
function connectToBackground() {
  try {
    chrome.runtime.sendMessage({ type: "connect" }, (res) => {
      if (chrome.runtime.lastError) {
        console.error("Error connecting to background:", chrome.runtime.lastError.message);
        setTimeout(connectToBackground, 3000);
      } else {
        console.log("Background WS response:", res);
      }
    });
  } catch (e) {
    console.error("Could not connect to background script:", e);
    setTimeout(connectToBackground, 3000);
  }
}
connectToBackground();

// Send audio chunks to background
function sendAudioChunk(chunk) {
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: "send-audio", data: chunk });
  }
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
  console.log("Attempting to play audio from URL:", audioUrl);

  const audio = new Audio(audioUrl);

  // --- THIS IS THE CRITICAL FIX ---
  // The play() function returns a Promise. We need to catch any errors.
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.then(_ => {
      // Automatic playback started!
      console.log("Audio playback started successfully.");
    }).catch(error => {
      // Automatic playback was prevented.
      console.error("Audio playback failed. This is likely due to the browser's autoplay policy.", error);
      // As a fallback, try to unmute the main video on the page
      const video = document.querySelector('video');
      if (video) {
        video.muted = false;
        console.log("Attempted to unmute the main video to enable audio context.");
      }
      isPlaying = false; // Allow the next item to be tried
    });
  }

  audio.onended = () => {
    console.log("Audio playback finished.");
    isPlaying = false;
    playNextAudio();
  };

  audio.onerror = (e) => {
    console.error("An error occurred with the audio element itself:", e);
    isPlaying = false;
    playNextAudio(); // Try the next in queue even if this one fails
  }
}

function base64toBlob(base64Data, contentType) {
    try {
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
    } catch (e) {
        console.error("Error decoding base64 string:", e);
        return new Blob([]); // Return an empty blob on error
    }
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
    whiteSpace: "pre-wrap",
    wordWrap: "break-word"
  });
  container.appendChild(subtitleDiv);
}

// ======= AUDIO CAPTURE =======
async function captureAudio(video) {
  if (!video.duration || video.duration <= 1) return;
  if (workletNode || (audioContext && audioContext.state !== "closed")) return;

  try {
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
  } catch (e) {
      console.error("Error capturing audio:", e);
  }
}

// ======= INITIALIZATION =======
function initializeForCurrentVideo() {
  const video = document.querySelector("video");
  if (!video || video.dataset.hasSubtitleOverlay === "true") return;

  video.dataset.hasSubtitleOverlay = "true";
  createSubtitleOverlay(video);
  
  // A common trick to enable autoplay is to first mute and then unmute the video
  const originalMuted = video.muted;
  video.muted = true;
  video.play().then(() => {
    video.muted = originalMuted;
    captureAudio(video);
  }).catch(e => {
    console.error("Video play() failed, audio capture might not work.", e);
    // Still try to capture audio, it might work if user plays manually
    captureAudio(video);
  });
}

// Re-initialize when the user navigates on sites like YouTube
window.addEventListener('yt-navigate-finish', initializeForCurrentVideo);
window.addEventListener('spfdone', initializeForCurrentVideo); // Older YouTube event

const observer = new MutationObserver((mutations) => {
    for(let mutation of mutations) {
        if (mutation.type === 'childList') {
            const video = document.querySelector('video');
            if (video && video.dataset.hasSubtitleOverlay !== "true") {
                initializeForCurrentVideo();
                return; // Found a new video, no need to keep observing this batch
            }
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Initial call
setTimeout(initializeForCurrentVideo, 1000);
