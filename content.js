const video = document.querySelector('video');
if (video) {
    console.log('Video found:', video);

    // Create subtitle overlay
    let subtitleDiv = document.getElementById('subtitleOverlay');
    if (!subtitleDiv) {
        subtitleDiv = document.createElement('div');
        subtitleDiv.id = 'subtitleOverlay';
        subtitleDiv.style.position = 'absolute';
        subtitleDiv.style.bottom = '10%';
        subtitleDiv.style.width = '100%';
        subtitleDiv.style.textAlign = 'center';
        subtitleDiv.style.color = 'white';
        subtitleDiv.style.fontSize = '24px';
        subtitleDiv.style.textShadow = '2px 2px 4px black';
        subtitleDiv.style.pointerEvents = 'none';
        document.body.appendChild(subtitleDiv);
    }

    // Sample subtitles synced with video time
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
        if (currentSubtitle) {
            subtitleDiv.innerText = currentSubtitle.text;
        }
    });
}
