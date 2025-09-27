let subtitleDiv = null;
let audioQueue = [];
let isPlaying = false;

function createSubtitleOverlay() {
  if (document.getElementById('subtitle-overlay')) {
    return;
  }

  subtitleDiv = document.createElement('div');
  subtitleDiv.id = 'subtitle-overlay';
  subtitleDiv.style.position = 'fixed';
  subtitleDiv.style.bottom = '10%';
  subtitleDiv.style.left = '50%';
  subtitleDiv.style.transform = 'translateX(-50%)';
  subtitleDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  subtitleDiv.style.color = 'white';
  subtitleDiv.style.padding = '10px 20px';
  subtitleDiv.style.borderRadius = '5px';
  subtitleDiv.style.fontSize = '24px';
  subtitleDiv.style.zIndex = '2147483647';
  document.body.appendChild(subtitleDiv);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'backend-message') {
    const data = JSON.parse(msg.data);
    if (data.translatedText) {
      if (!subtitleDiv) {
        createSubtitleOverlay();
      }
      subtitleDiv.textContent = data.translatedText;
    }
    if (data.audioData) {
      const audioBlob = new Blob([new Uint8Array(atob(data.audioData).split("").map(char => char.charCodeAt(0)))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      audioQueue.push(audioUrl);
      playNextAudio();
    }
  }
});

function playNextAudio() {
  if (isPlaying || audioQueue.length === 0) {
    return;
  }

  isPlaying = true;
  const audioUrl = audioQueue.shift();
  const audio = new Audio(audioUrl);

  audio.onended = () => {
    isPlaying = false;
    playNextAudio();
  };

  audio.play().catch(e => {
    console.error('Error playing audio:', e);
    isPlaying = false;
  });
}
