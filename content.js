// content.js

function createSubtitleOverlay(video) {
    let subtitleDiv = document.getElementById('subtitleOverlay');
    if (!subtitleDiv) {
        // Create the overlay
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
        subtitleDiv.style.bottom = '10%';
        
        // Append to video parent container for stable positioning
        video.parentElement.style.position = 'relative'; // ensure parent is relative
        video.parentElement.appendChild(subtitleDiv);
    }

    // Sample subtitles (time in seconds)
    const subtitles = [
        { time: 0, text: "Hello, welcome to the video!" },
        { time: 5, text: "This is a test subtitle." },
        { time: 10, text: "It will change as the video plays." }
    ];

    // Update subtitles as video plays
    video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;
        const currentSubtitle = subtitles
            .slice().reverse()
            .find(sub => currentTime >= sub.time);
        if (currentSubtitle) {
            subtitleDiv.innerText = currentSubtitle.text;
        } else {
            subtitleDiv.innerText = '';
        }
    });
}

// Use MutationObserver to detect the video element dynamically
const observer = new MutationObserver((mutations) => {
    const video = document.querySelector('video');
    if (video) {
        console.log('Video found:', video);
        createSubtitleOverlay(video);
        observer.disconnect(); // stop observing once found
    }
});

observer.observe(document.body, { childList: true, subtree: true });
