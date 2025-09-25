let subtitleDiv = null;
let audioQueue = [];
let isPlaying = false;

// Handle messages from backend (relayed by background script)
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
  audio.play().catch(error => {
    console.error("Audio playback failed:", error);
    isPlaying = false; // Allow next audio to play if this one fails
  });
  audio.onended = () => {
    isPlaying = false;
    playNextAudio();
  };
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
        // Return an empty blob if decoding fails
        return new Blob([]);
    }
}

// ======= UI & INITIALIZATION =======
function createUiElements(video) {
  // Prevent duplicate buttons
  if (document.getElementById("liveTranslator-start-button")) return;

  const container = document.querySelector(".html5-video-player") || video.parentElement;
  if (!container) return;
  container.style.position = 'relative';

  // Create the "Start" button
  const startButton = document.createElement('button');
  startButton.id = 'liveTranslator-start-button';
  startButton.textContent = 'Start Live Translation';
  Object.assign(startButton.style, {
      position: 'absolute', top: '10px', left: '10px', zIndex: '2147483647',
      padding: '10px 15px', backgroundColor: '#ff0000', color: 'white',
      border: 'none', borderRadius: '5px', cursor: 'pointer',
      fontSize: '14px', fontWeight: 'bold'
  });
  container.appendChild(startButton);

  // Create the subtitle overlay (initially hidden)
  subtitleDiv = document.createElement("div");
  subtitleDiv.id = "subtitleOverlay";
  Object.assign(subtitleDiv.style, {
    position: "absolute", width: "80%", left: "10%", bottom: "10%",
    textAlign: "center", color: "white", fontSize: "26px", fontWeight: "bold",
    textShadow: "2px 2px 4px black", pointerEvents: "none", zIndex: "2147483647",
    backgroundColor: "rgba(0,0,0,0.5)", padding: "10px", borderRadius: "8px",
    visibility: 'hidden'
  });
  container.appendChild(subtitleDiv);

  // Add the click listener
  startButton.addEventListener('click', () => {
    console.log("Start button clicked. Muting video and requesting capture from background script.");
    video.muted = true; // Mute the original video to prevent echo
    
    // Tell the background script to start capturing this tab's audio
    chrome.runtime.sendMessage({ type: 'startCapture' });
    
    // Update button state
    startButton.textContent = 'Translation Active';
    startButton.style.backgroundColor = '#00c853';
    startButton.disabled = true;
    subtitleDiv.style.visibility = 'visible';
  }, { once: true });
}

function initializeForCurrentVideo() {
  const video = document.querySelector("video");
  if (!video || video.dataset.hasTranslatorUi === "true") return;

  video.dataset.hasTranslatorUi = "true";
  createUiElements(video);
}

// Use a MutationObserver to detect when a new video is loaded on the page (e.g., on YouTube)
const observer = new MutationObserver(() => {
    const video = document.querySelector('video');
    if (video && video.dataset.hasTranslatorUi !== "true") {
        initializeForCurrentVideo();
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Initial check
setTimeout(initializeForCurrentVideo, 1500);

