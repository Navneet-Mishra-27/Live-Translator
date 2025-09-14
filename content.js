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

function captureAudio(video) {
    try {
        // Use captureStream if available and not already captured
        if (!capturedAudioStream && video.captureStream) {
            capturedAudioStream = video.captureStream();
            console.log("Audio stream captured via captureStream:", capturedAudioStream);
            // capturedAudioStream can now be used for audio processing pipeline
        } else {
            console.warn("captureStream not supported or already captured");
        }
    } catch (e) {
        console.warn("Audio capture failed:", e);
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
