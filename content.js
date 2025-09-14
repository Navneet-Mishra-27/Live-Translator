// content.js

let audioContext;

// Utility: attach overlay, no duplication
function createSubtitleOverlay(video) {
    if (document.getElementById('subtitleOverlay')) return;
    const container = video.closest('.html5-video-container') || video.parentElement;
    if (!container) return;
    container.style.position = 'relative';

    const subtitleDiv = document.createElement('div');
    subtitleDiv.id = 'subtitleOverlay';
    subtitleDiv.style.position = 'absolute';
    subtitleDiv.style.width = '100%';
    subtitleDiv.style.bottom = '10%';
    subtitleDiv.style.textAlign = 'center';
    subtitleDiv.style.color = 'white';
    subtitleDiv.style.fontSize = '24px';
    subtitleDiv.style.textShadow = '2px 2px 6px black';
    subtitleDiv.style.pointerEvents = 'none';
    subtitleDiv.style.zIndex = '999999';
    container.appendChild(subtitleDiv);

    const subtitles = [
        { time: 0, text: "Hello, welcome to the video!" },
        { time: 5, text: "This is a test subtitle." },
        { time: 10, text: "It will change as the video plays." }
    ];

    video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;
        const currentSubtitle = subtitles.slice().reverse().find(s => currentTime >= s.time);
        subtitleDiv.innerText = currentSubtitle ? currentSubtitle.text : '';
    });
}

// Safe audio capture
function captureAudio(video) {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Ensure only one source per video
        if (!video.audioSource) {
            const source = audioContext.createMediaElementSource(video);
            video.audioSource = source;

            // Connect only to processing
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);

            video.audioStream = destination.stream;
            console.log("Audio stream captured (processing only)", video.audioStream);
        }
    } catch (e) {
        console.warn("Audio capture skipped (possibly in use by YouTube player):", e);
    }
}

// Resume audio context once per user interaction (Chrome policy)
document.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => console.log("AudioContext resumed"));
    }
}, { once: true });

// Detect video updates (YouTube SPA navigation and DOM mutations)
function initializeForCurrentVideo() {
    const video = document.querySelector('video');
    if (video && !video.dataset.hasSubtitleOverlay) {
        captureAudio(video);
        createSubtitleOverlay(video);
        video.dataset.hasSubtitleOverlay = "true";
    }
}

// Listen for navigation events (YouTube SPA)
window.addEventListener('yt-navigate-finish', initializeForCurrentVideo);

// Backup: MutationObserver for video additions
const observer = new MutationObserver(initializeForCurrentVideo);
observer.observe(document.body, { childList: true, subtree: true });

// Initial load
initializeForCurrentVideo();
