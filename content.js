function createSubtitleOverlay(video) {
    let subtitleDiv = document.getElementById('subtitleOverlay');
    if (!subtitleDiv) {
        subtitleDiv = document.createElement('div');
        subtitleDiv.id = 'subtitleOverlay';
        subtitleDiv.style.position = 'absolute';
        subtitleDiv.style.color = 'white';
        subtitleDiv.style.fontSize = '24px';
        subtitleDiv.style.textShadow = '2px 2px 6px black';
        subtitleDiv.style.textAlign = 'center';
        subtitleDiv.style.pointerEvents = 'none';
        subtitleDiv.style.zIndex = '99999';
        subtitleDiv.style.width = '100%';
        subtitleDiv.style.bottom = '10%';

        // Attach to the nearest container that holds the video and controls
        const container = video.closest('.html5-video-container') || video.parentElement;
        container.style.position = 'relative';
        container.appendChild(subtitleDiv);
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
