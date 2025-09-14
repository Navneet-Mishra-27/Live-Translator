let audioContext;

function createSubtitleOverlay(video) {
    if (document.getElementById('subtitleOverlay')) return;
    const container = video.closest('.html5-video-container') || video.parentElement;
    if (!container) {
        console.warn("No container found for subtitle overlay");
        return;
    }
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
    subtitleDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'; // visible background
    container.appendChild(subtitleDiv);
    console.log("Subtitle overlay created");

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

function captureAudio(video) {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (!video.audioSource) {
            // Do NOT connect the source to destination - just create the source for processing
            const source = audioContext.createMediaElementSource(video);
            video.audioSource = source;
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);
            video.audioStream = destination.stream;
            console.log("Audio stream captured for processing - audio unaffected");
        }
    } catch (e) {
        console.warn("Audio capture skipped to avoid audio disruption:", e);
    }
}

document.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => console.log("AudioContext resumed"));
    }
}, { once: true });

function initializeForCurrentVideo() {
    const video = document.querySelector('video');
    if (video && !video.dataset.hasSubtitleOverlay) {
        console.log("Initializing for video element");
        captureAudio(video);
        createSubtitleOverlay(video);
        video.dataset.hasSubtitleOverlay = "true";
    }
}

// YouTube SPA events; added fallback to ensure triggered
window.addEventListener('yt-navigate-finish', initializeForCurrentVideo);
window.addEventListener('yt-page-data-updated', initializeForCurrentVideo);

// MutationObserver fallback for dynamic page changes
const observer = new MutationObserver(initializeForCurrentVideo);
observer.observe(document.body, { childList: true, subtree: true });

// Initial load initialization
initializeForCurrentVideo();
