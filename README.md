# Real-Time AI Video Translator & Dubber

A full-stack application that provides live transcription, multilingual translation, and audio dubbing for any video playing in the browser. This project demonstrates a low-latency, real-time data pipeline integrating modern AI services.

## How It Works

The application consists of a Chrome Extension frontend and a Node.js backend, communicating in real-time using WebSockets.

1.  **Audio Capture**: The Chrome Extension's background script captures audio from the active tab using the `chrome.tabCapture` API.
2.  **Real-Time Streaming**: The captured audio is encoded into PCM format and streamed to the Node.js backend via a persistent WebSocket connection.
3.  **AI Processing Pipeline**: The backend server receives the audio stream and orchestrates a multi-step AI pipeline:
    * **Transcription**: The audio is sent to the Google Gemini API to be transcribed into text.
    * **Translation**: The transcribed text is sent back to the Gemini API to be translated into the user's selected language.
    * **Speech Synthesis (Dubbing)**: The translated text is sent to the Google Cloud Text-to-Speech API to generate a natural-sounding audio dub.
4.  **Stream Back to Client**: The final translated text and synthesized audio are sent back to the Chrome Extension over the WebSocket connection.
5.  **Render Output**: The extension's content script displays the subtitles as an overlay on the video and plays the dubbed audio track.

## Tech Stack

* **Backend**: Node.js, Express.js, WebSockets (`ws` library), dotenv
* **Frontend**: JavaScript, Chrome Extension API (Manifest V3), HTML5, CSS3
* **AI Services**: Google Gemini API (Transcription & Translation), Google Cloud Text-to-Speech
* **Audio Library**: `wav` (for processing PCM audio streams on the backend)

## Setup & Installation

### Backend Server

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Navneet-Mishra-27/live-translator.git](https://github.com/Navneet-Mishra-27/live-translator.git)
    cd live-translator
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    * Create a file named `.env` in the root of the project directory.
    * Add your Google Gemini API key to this file:
        ```
        GOOGLE_API_KEY="YOUR_GOOGLE_AI_KEY_HERE"
        ```
4.  **Authenticate with Google Cloud:**
    For the Text-to-Speech service to work, you need to authenticate with the `gcloud` CLI. Follow the instructions [here](https://cloud.google.com/sdk/docs/install) to install it. Then, run the following command in your terminal and follow the login instructions:
    ```bash
    gcloud auth application-default login
    ```
5.  **Start the server:**
    ```bash
    node server.js
    ```
    The server should now be running on `http://localhost:3000`.

### Chrome Extension

1.  Open Google Chrome and navigate to `chrome://extensions`.
2.  Enable "Developer mode" using the toggle in the top-right corner.
3.  Click the "Load unpacked" button.
4.  Select the folder containing the extension's files (e.g., `manifest.json`, `content.js`).
5.  The extension will be installed and ready to use. Navigate to a page with a video (like YouTube) to see it in action.

## Important Note on API Keys & Billing

This project relies on the Google Gemini API and Google Cloud Text-to-Speech, which are paid services.

* To use these APIs, you must have a valid Google Cloud project with a billing account enabled.
* New Google Cloud users may be eligible for a free trial credit.

The application will not function without a valid API key and an active billing account.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
