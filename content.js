let capturedAudioStream = null;

function createSubtitleOverlay(video) {
    if (document.getElementById('subtitleOverlay')) return;
    const container = document.querySelector('.html5-video-player');
    if (!container) return;
    container.style.position = 'relative';

    const subtitleDiv = document.createElement('div');
    subtitleDiv.id = 'subtitleOverlay';
    subtitleDiv.style.position = 'absolute';
    subtitleDiv.style.width = '100%';
    subtitleDiv.style.bottom = '15%';  // Raised above controls
    subtitleDiv.style.textAlign = 'center';
    subtitleDiv.style.color = 'yellow';  // Highly visible color
    subtitleDiv.style.fontSize = '28px'; // Larger font size
    subtitleDiv.style.textShadow = '2px 2px 6px black';
    subtitleDiv.style.pointerEvents = 'none';
    subtitleDiv.style.zIndex = '2147483647';  // Max z-index to ensure visibility
    subtitleDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';  // Dark translucent background for contrast
    subtitleDiv.style.padding = '4px 8px';
    subtitleDiv.style.borderRadius = '4px';
    subtitleDiv.style.userSelect = 'none';  // Prevent text selection
    subtitleDiv.style.whiteSpace = 'nowrap';  // Prevent line breaks
    container.appendChild(subtitleDiv);

    const subtitles = [
        { time: 0, text: "Hello, welcome to the video!" },
        { time: 5, text: "This is a test subtitle." },
        { time: 10, text: "It will change as the video plays." }
    ];

    video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;
        const currentSubtitle = subtitles.slice().reverse().find(s => currentTime >= s.time);
        console.log("Video time:", currentTime.toFixed(2), "Current subtitle:", currentSubtitle ? currentSubtitle.text : "None");
        subtitleDiv.textContent = currentSubtitle ? currentSubtitle.text : '';
    });
}

function processAudioStream(stream) {
    try {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);

        // ScriptProcessor is old but works for debugging
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (event) => {
            const audioData = event.inputBuffer.getChannelData(0);
            console.log("Captured audio chunk:", audioData.slice(0, 10)); 
            // show only first 10 samples for readability
        };

        console.log("Audio processing started");
    } catch (e) {
        console.error("Failed to process audio stream:", e);
    }
}

function captureAudio(video) {
    try {
        const audioContext = new AudioContext();

        const source = audioContext.createMediaElementSource(video);

        // Your processor (for debugging or sending to STT)
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(audioContext.destination);

        // Also route video audio to speakers directly
        source.connect(audioContext.destination);

        processor.onaudioprocess = (event) => {
            const audioData = event.inputBuffer.getChannelData(0);
            console.log("Audio samples:", audioData.slice(0, 10));
        };

        console.log("Audio processing started with MediaElementSource (sound + capture)");
    } catch (e) {
        console.error("Audio capture failed:", e);
    }
}


function initializeForCurrentVideo() {
    const video = document.querySelector('video');
    if (video && !video.dataset.hasSubtitleOverlay) {
        console.log("Initializing subtitles and audio capture");
        captureAudio(video);
        createSubtitleOverlay(video);
        video.dataset.hasSubtitleOverlay = "true";
    }
}


window.addEventListener('yt-navigate-finish', initializeForCurrentVideo);
window.addEventListener('yt-page-data-updated', initializeForCurrentVideo);

const observer = new MutationObserver(initializeForCurrentVideo);
observer.observe(document.body, { childList: true, subtree: true });

initializeForCurrentVideo();
