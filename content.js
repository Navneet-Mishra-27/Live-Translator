// content.js
const video = document.querySelector('video');
if (video) {
    console.log('Video found:', video);

    // Create a subtitle overlay
    const subtitleDiv = document.createElement('div');
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
