// content.js

function createSubtitleOverlay(video) {
    let subtitleDiv = document.getElementById('subtitleOverlay');
    if (!subtitleDiv) {
        subtitleDiv = document.createElement('div');
        subtitleDiv.id = 'subtitleOverlay';
        subtitleDiv.style.position = 'absolute';
        subtitleDiv.style.color = 'white';
        subtitleDiv.style.fontSize = '24px';
        subtitleDiv.style.textShadow = '2px 2px 4px black';
        subtitleDiv.style.textAlign = 'center';
        subtitleDiv.style.pointerEvents = 'none';
        subtitleDiv.style.zIndex = '9999';
        subtitleDiv.style.width = '100%';
        subtitleDiv.style.bottom = '15%';

        // Attach to the YouTube player container
        const player = document.querySelector('.html5-video-player');
        if (player) {
            player.style.position = 'relative';
            player.appendChild(subtitleDiv);
        }
    }

    const subtitles = [
        { time: 0, text: "Hello, welcome to the video!" },
        { time: 5, text: "This is a test subtitle." },
        { time: 10, text: "It will change as the video plays." }
    ];

    video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;
        const currentSubtitle = subtitles
            .slice().reverse()
            .find(sub => currentTime >= sub.time);
        subtitleDiv.innerText = currentSubtitle ? currentSubtitle.text : '';
    });
}

// MutationObserver to handle dynamically loaded videos
const observer = new MutationObserver(() => {
    const video = document.querySelector('video');
    if (video && !video.hasSubtitleOverlay) {
        console.log('Video found:', video);

        // Step 1: Capture audio from the video
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        if (!video.audioSource) {
            const source = audioContext.createMediaElementSource(video);
            video.audioSource = source;

            // Connect to speakers so video plays
            source.connect(audioContext.destination);

            // Also connect to a MediaStreamDestination to capture audio
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);

            video.audioStream = destination.stream;
            console.log("Audio stream captured:", video.audioStream);
        }

        // Step 2: Create the subtitle overlay
        createSubtitleOverlay(video);

        video.hasSubtitleOverlay = true;
    }
});

observer.observe(document.body, { childList: true, subtree: true });
