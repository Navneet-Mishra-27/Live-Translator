let ws;
let audioContext = null;
let workletNode = null;

function connectToServer() {
    ws = new WebSocket("ws://localhost:3000");
    ws.onopen = () => console.log("Connected to backend server");
    ws.onmessage = (event) => console.log("Message from server:", event.data);
    ws.onclose = () => {
        console.log("Disconnected from backend, retrying in 3s...");
        setTimeout(connectToServer, 3000);
    };
}
connectToServer();

const subtitles = [
    { time: 0, text: "Hello, welcome to the video!" },
    { time: 5, text: "This is a test subtitle." },
    { time: 10, text: "It will change as the video plays." }
];

function createSubtitleOverlay(video) {
    if (document.getElementById('subtitleOverlay')) return;
    const container = document.querySelector('.html5-video-player') || video.parentElement;
    if (!container) return;
    container.style.position = 'relative';

    const subtitleDiv = document.createElement('div');
    subtitleDiv.id = 'subtitleOverlay';
    Object.assign(subtitleDiv.style, {
        position: 'absolute',
        width: '100%',
        bottom: '15%',
        textAlign: 'center',
        color: 'yellow',
        fontSize: '28px',
        textShadow: '2px 2px 6px black',
        pointerEvents: 'none',
        zIndex: '2147483647',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: '4px 8px',
        borderRadius: '4px',
        userSelect: 'none',
        whiteSpace: 'nowrap'
    });
    container.appendChild(subtitleDiv);
    let lastIndex = -1;
    video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;
        if (lastIndex + 1 < subtitles.length && currentTime >= subtitles[lastIndex + 1].time) {
            lastIndex++;
        }
        subtitleDiv.textContent = lastIndex >= 0 ? subtitles[lastIndex].text : '';
    });
}

async function captureAudio(video) {
    try {
        // Clean up previous context
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        audioContext = new AudioContext();
        await audioContext.audioWorklet.addModule(chrome.runtime.getURL('pcmProcessor.js'));
        if (workletNode) workletNode.disconnect();
        const source = audioContext.createMediaElementSource(video);
        workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
        workletNode.port.onmessage = (event) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(event.data);
            }
        };
        source.connect(workletNode).connect(audioContext.destination);
        console.log("Audio capture started using AudioWorklet");
    } catch (e) {
        console.error("Audio capture failed:", e);
    }
}

function initializeForCurrentVideo() {
    const video = document.querySelector('video');
    if (video && !video.dataset.hasSubtitleOverlay) {
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
