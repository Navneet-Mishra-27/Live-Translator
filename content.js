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
  const audio = new Audio(audioUrl);

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.then(_ => {
      console.log("Audio playback started successfully.");
    }).catch(error => {
      console.error("Audio playback failed.", error);
      isPlaying = false; 
    });
  }

  audio.onended = () => {
    isPlaying = false;
    playNextAudio();
  };

  audio.onerror = (e) => {
    console.error("An error occurred with the audio element:", e);
    isPlaying = false;
    playNextAudio();
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
        return new Blob([]);
    }
}

// ======= UI & INITIALIZATION =======

function createUiElements(video) {
  if (document.getElementById("liveTranslator-start-button")) return;

  const container = document.querySelector(".html5-video-player") || video.parentElement;
  if (!container) return;
  container.style.position = 'relative';

  // Create Start Button
  const startButton = document.createElement('button');
  startButton.id = 'liveTranslator-start-button';
  startButton.textContent = 'Start Live Translation';
  Object.assign(startButton.style, {
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: '2147483647',
      padding: '10px 15px',
      backgroundColor: '#ff0000',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold'
  });
  
  container.appendChild(startButton);

  // Create Subtitle Overlay (initially hidden)
  subtitleDiv = document.createElement("div");
  subtitleDiv.id = "subtitleOverlay";
  Object.assign(subtitleDiv.style, {
    position: "absolute",
    width: "80%",
    left: "10%",
    bottom: "10%",
    textAlign: "center",
    color: "white",
    fontSize: "26px",
    fontWeight: "bold",
    textShadow: "2px 2px 4px black",
    pointerEvents: "none",
    zIndex: "2147483647",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: "10px",
    borderRadius: "8px",
    visibility: 'hidden' // Initially hidden
  });
  container.appendChild(subtitleDiv);

  // Add event listener to the button
  startButton.addEventListener('click', () => {
    console.log("Start button clicked by user.");
    startButton.textContent = 'Translation Active';
    startButton.style.backgroundColor = '#00c853'; // Green
    startButton.disabled = true;

    // Show subtitles and start audio capture
    subtitleDiv.style.visibility = 'visible';
    captureAudio(video);
  }, { once: true }); // The listener only needs to fire once
}

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
    source.connect(workletNode).connect(audioContext.destination);

    console.log("Audio capture started after user interaction.");
    video.muted = false; // Ensure video sound is on
    video.play();

    video.addEventListener("ended", () => {
      if (workletNode) workletNode.disconnect();
      if (audioContext) audioContext.close();
    });
  } catch (e) {
      console.error("Error capturing audio:", e);
  }
}

function initializeForCurrentVideo() {
  const video = document.querySelector("video");
  if (!video || video.dataset.hasTranslatorUi === "true") return;

  video.dataset.hasTranslatorUi = "true";
  createUiElements(video);
}

// Re-initialize when the user navigates on sites like YouTube
window.addEventListener('yt-navigate-finish', initializeForCurrentVideo);
window.addEventListener('spfdone', initializeForCurrentVideo);

const observer = new MutationObserver(() => {
    const video = document.querySelector('video');
    if (video && video.dataset.hasTranslatorUi !== "true") {
        initializeForCurrentVideo();
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Initial call
setTimeout(initializeForCurrentVideo, 1500);

