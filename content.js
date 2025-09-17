let ws;
let audioContext = null;
let workletNode = null;

// ======= WEBSOCKET =======
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

// ======= SUBTITLES =======
const subtitles = [
    { time: 0, text: "Hello, welcome to the video!" },
    { time: 5, text: "This is a test subtitle." },
    { time: 10, text: "It will change as the video plays." }
];

function createSubtitleOverlay(video) {
    const existing = document.getElementById('subtitleOverlay');
    if (existing) existing.remove();

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

    function updateSubtitle() {
        const currentTime = video.currentTime;
        if (lastIndex + 1 < subtitles.length && currentTime >= subtitles[lastIndex + 1].time) {
            lastIndex++;
        }
        const currentText = lastIndex >= 0 ? subtitles[lastIndex].text : '';
        subtitleDiv.textContent = currentText;

        // Send subtitle text in real-time via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'subtitle', time: currentTime, text: currentText }));
        }
    }

    video.addEventListener('timeupdate', updateSubtitle);
    video.addEventListener('ended', () => {
        subtitleDiv.textContent = '';
        lastIndex = -1;
    });
}

// ======= AUDIO CAPTURE WITH EMBEDDED WORKLET =======
async function captureAudio(video) {
    try {
        if (!video.duration || video.duration <= 1) return; // skip ads

        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        audioContext = new AudioContext();

        // Embedded AudioWorklet processor
        const processorCode = `
        class PCMProcessor extends AudioWorkletProcessor {
            process(inputs) {
                const input = inputs[0][0];
                if (!input) return true;
                const buffer = new ArrayBuffer(input.length * 2);
                const view = new DataView(buffer);
                for (let i = 0; i < input.length; i++) {
                    let s = Math.max(-1, Math.min(1, input[i]));
                    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
                }
                this.port.postMessage(buffer);
                return true;
            }
        }
        registerProcessor('pcm-processor', PCMProcessor);
        `;
        const blob = new Blob([processorCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await audioContext.audioWorklet.addModule(url);

        if (workletNode) workletNode.disconnect();
        const source = audioContext.createMediaElementSource(video);
        workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');

        workletNode.port.onmessage = (event) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(event.data);
            }
        };

        source.connect(workletNode).connect(audioContext.destination);
        console.log("Audio capture started (real video only)");

        video.addEventListener('ended', () => {
            workletNode.disconnect();
            audioContext.close();
            audioContext = null;
            workletNode = null;
        });

    } catch (e) {
        console.error("Audio capture failed:", e);
    }
}

// ======= INITIALIZATION =======
function initializeForCurrentVideo() {
    const video = document.querySelector('video');
    if (!video) return;

    video.dataset.hasSubtitleOverlay = "";

    if (!video.dataset.hasSubtitleOverlay) {
        captureAudio(video);
        createSubtitleOverlay(video);
        video.dataset.hasSubtitleOverlay = "true";
    }
}

// Listen for SPA navigation / playlist changes
window.addEventListener('yt-navigate-finish', initializeForCurrentVideo);
window.addEventListener('yt-page-data-updated', initializeForCurrentVideo);
const observer = new MutationObserver(initializeForCurrentVideo);
observer.observe(document.body, { childList: true, subtree: true });

// Initial call
initializeForCurrentVideo();
