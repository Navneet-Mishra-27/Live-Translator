let capturedAudioStream = null;

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
    subtitleDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
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

function captureAudio(video) {
    try {
        // Use captureStream if available and not already captured
        if (!capturedAudioStream && video.captureStream) {
            capturedAudioStream = video.captureStream();
            console.log("Audio stream captured via captureStream:", capturedAudioStream);
            // You can use capturedAudioStream for your processing pipeline
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
