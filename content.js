let ws;
let audioContext = null;
let workletNode = null;

// ======= WEBSOCKET =======
function connectToServer() {
    ws = new WebSocket("ws://localhost:3000");
    ws.onopen = () => console.log("Connected to backend server");
    ws.onmessage = (event) => handleBackendMessage(event.data);
    ws.onclose = () => {
        console.log("Disconnected from backend, retrying in 3s...");
        setTimeout(connectToServer, 3000);
    };
}
connectToServer();

// ======= HANDLE BACKEND MESSAGES =======
function handleBackendMessage(data) {
    try {
        const msg = JSON.parse(data);
        if (msg.type === 'subtitle') {
            const subtitleDiv = document.getElementById('subtitleOverlay');
            if (subtitleDiv) subtitleDiv.textContent = msg.text || '';
        }
    } catch (e) {
        console.error("Failed to parse backend message:", e);
    }
}

// ======= CREATE SUBTITLE OVERLAY =======
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
}

// ======= AUDIO CAPTURE WITH AUDIOWORKLET =======
async function captureAudio(video) {
    try {
        if (!video.duration || video.duration <= 1) return; // skip ads
        if (workletNode || (audioContext && audioContext.state !== 'closed')) return;

        audioContext = new AudioContext();

        // Create AudioWorklet processor
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

        const source = audioContext.createMediaElementSource(video);
        workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');

        // Send audio chunks to WebSocket
        workletNode.port.onmessage = (event) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(event.data);
            }
        };

        // **Connect video to both capture node and destination**
        source.connect(workletNode);           // for capturing
        source.connect(audioContext.destination); // for hearing audio

        console.log("Audio capture started (you should hear video now)");

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
    if (video.dataset.hasSubtitleOverlay === "true") return;

    video.dataset.hasSubtitleOverlay = "true";
    createSubtitleOverlay(video);
    captureAudio(video);
}

// SPA / playlist support
window.addEventListener('yt-navigate-finish', initializeForCurrentVideo);
window.addEventListener('yt-page-data-updated', initializeForCurrentVideo);
const observer = new MutationObserver(initializeForCurrentVideo);
observer.observe(document.body, { childList: true, subtree: true });

// Initial call
initializeForCurrentVideo();
