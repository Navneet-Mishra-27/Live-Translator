// content.js

function createSubtitleOverlay(video) {
    // Avoid creating multiple overlays
    if (document.getElementById('subtitleOverlay')) return;

    // Find the proper container
    const container = video.closest('.html5-video-container') || video.parentElement;
    if (!container) return;

    // Ensure container has relative positioning
    container.style.position = 'relative';

    // Create overlay div
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

    // Hardcoded sample subtitles
    const subtitles = [
        { time: 0, text: "Hello, welcome to the video!" },
        { time: 5, text: "This is a test subtitle." },
        { time: 10, text: "It will change as the video plays." }
    ];

    // Update subtitle as video plays
    video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;
        const currentSubtitle = subtitles.slice().reverse().find(s => currentTime >= s.time);
        subtitleDiv.innerText = currentSubtitle ? currentSubtitle.text : '';
    });
}

// MutationObserver to detect dynamically loaded videos
const observer = new MutationObserver(() => {
    const video = document.querySelector('video');

    if (video && !video.hasSubtitleOverlay) {
        const container = video.closest('.html5-video-container') || video.parentElement;
        if (!container) return; // Wait until container exists

        console.log('Video found:', video);

        // Step 1: Capture audio safely
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (!video.audioSource) {
            const source = audioContext.createMediaElementSource(video);
            video.audioSource = source;

            // Let video play normally
            source.connect(audioContext.destination);

            // Also connect to MediaStreamDestination to capture audio
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);

            video.audioStream = destination.stream;
            console.log("Audio stream captured:", video.audioStream);
        }

        // Step 2: Create subtitle overlay
        createSubtitleOverlay(video);

        video.hasSubtitleOverlay = true;
    }
});

// Start observing the body for dynamically loaded videos
observer.observe(document.body, { childList: true, subtree: true });
