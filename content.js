// content.js

let audioContext; // make audioContext global for user interaction resume

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

// Function to safely capture audio
function captureAudio(video) {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (!video.audioSource) {
            const source = audioContext.createMediaElementSource(video);
            video.audioSource = source;

            // Only connect to MediaStreamDestination for processing, NOT to destination
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);
            video.audioStream = destination.stream;

            console.log("Audio stream captured (processing only)", video.audioStream);
        }
    } catch (e) {
        console.warn("Audio capture skipped (probably already in use by YouTube):", e);
    }
}

// Resume audio context on first user interaction (required by Chrome)
document.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => console.log("AudioContext resumed"));
    }
}, { once: true });

// MutationObserver to detect dynamically loaded videos
const observer = new MutationObserver(() => {
    const video = document.querySelector('video');
    if (video && !video.hasSubtitleOverlay) {
        const container = video.closest('.html5-video-container') || video.parentElement;
        if (!container) return;

        console.log('Video found:', video);

        // Step 1: Capture audio safely
        captureAudio(video);

        // Step 2: Create subtitle overlay
        createSubtitleOverlay(video);

        video.hasSubtitleOverlay = true;
    }
});

observer.observe(document.body, { childList: true, subtree: true });
