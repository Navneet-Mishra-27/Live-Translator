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

// ======= SUBTITLE OVERLAY =======
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

        // Avoid multiple audio contexts
        if (workletNode || (audioContext && audioContext.state !== 'closed')) return;

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

        const source = audioContext.createMediaElementSource(video);
        workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');

        workletNode.port.onmessage = (event) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(event.data);
            }
        };

        source.connect(workletNode).connect(audioContext.destination);
        console.log("Audio capture started (real video only)");

        // Cleanup on video end
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

// ======= REAL-TIME SUBTITLE STREAMING =======
function startSubtitleStreaming(video) {
    const subtitleDiv = document.getElementById('subtitleOverlay');
    if (!subtitleDiv) return;

    let lastText = "";
    const subtitles = []; // Initially empty, replace with backend updates later

    video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;

        // Example: dynamic subtitle replacement (if real-time backend is connected)
        let currentText = "";
        if (subtitles.length) {
            currentText = subtitles.slice().reverse().find(s => currentTime >= s.time)?.text || "";
        }

        subtitleDiv.textContent = currentText;

        // Send only when text changes
        if (currentText !== lastText) {
            lastText = currentText;
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'subtitle', time: currentTime, text: currentText }));
            }
        }
    });

    video.addEventListener('ended', () => {
        subtitleDiv.textContent = "";
        lastText = "";
    });
}

// ======= INITIALIZATION =======
function initializeForCurrentVideo() {
    const video = document.querySelector('video');
    if (!video) return;
    if (video.dataset.hasSubtitleOverlay === "true") return;

    video.dataset.hasSubtitleOverlay = "true";

    createSubtitleOverlay(video);
    captureAudio(video);
    startSubtitleStreaming(video);
}

// SPA / playlist support
window.addEventListener('yt-navigate-finish', initializeForCurrentVideo);
window.addEventListener('yt-page-data-updated', initializeForCurrentVideo);
const observer = new MutationObserver(initializeForCurrentVideo);
observer.observe(document.body, { childList: true, subtree: true });

// Initial call
initializeForCurrentVideo();
