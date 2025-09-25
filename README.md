Real-Time AI Video Translator & Dubber
A full-stack application that provides live transcription, multilingual translation, and audio dubbing for any video playing in the browser. This project demonstrates a low-latency, real-time data pipeline integrating modern AI services.

Demo
**

(Note to user: You should record a short screen capture of your project working and convert it to a GIF. This is the most impactful part of a README. You can use free tools like GIPHY Capture or ScreenToGif.)

► How It Works
The application consists of two main components: a Chrome Extension frontend and a Node.js backend. They communicate in real-time using WebSockets.

Audio Capture: The Chrome Extension's content script injects itself into a web page, captures the audio from a <video> element, and encodes it into PCM format.

Real-Time Streaming: The captured audio chunks are streamed to the Node.js backend via a persistent WebSocket connection.

AI Processing Pipeline: The backend server receives the audio stream and orchestrates a multi-step AI pipeline:

Transcription: The audio is sent to the Google Gemini API to be transcribed into text.

Translation: The transcribed text is sent back to the Gemini API to be translated into the user's selected language.

Speech Synthesis (Dubbing): The translated text is sent to the Google Cloud Text-to-Speech API to generate a natural-sounding audio dub.

Stream Back to Client: The final translated text (for subtitles) and the synthesized audio (for dubbing) are sent back to the Chrome Extension over the WebSocket connection.

Render Output: The extension displays the subtitles as an overlay on the video and plays the dubbed audio track in sync.

► Tech Stack
Category

Technologies

Backend

Node.js, Express.js, WebSockets (ws library), dotenv

Frontend

JavaScript, Chrome Extension API (Manifest V3), HTML5, CSS3

AI Services

Google Gemini API (Transcription & Translation), Google Cloud Text-to-Speech

Audio Library

wav (for processing PCM audio streams on the backend)

► Setup & Installation
To run this project locally, you will need to set up the backend server and the Chrome extension separately.

Backend Server
Clone the repository:

git clone [https://github.com/Navneet-Mishra-27/live-translator.git](https://github.com/Navneet-Mishra-27/live-translator.git)
cd live-translator

Install dependencies:

npm install

Set up environment variables:

Create a file named .env in the root of the project directory.

Add your Google Gemini API key to this file:

GOOGLE_API_KEY="YOUR_GOOGLE_AI_KEY_HERE"

Authenticate with Google Cloud:

For the Text-to-Speech service to work, you need to authenticate with the gcloud CLI. Follow the instructions here to install it.

Run the following command in your terminal and follow the login instructions:

gcloud auth application-default login

Start the server:

node server.js

The server should now be running on http://localhost:3000.

Chrome Extension
Open Google Chrome and navigate to chrome://extensions.

Enable "Developer mode" using the toggle in the top-right corner.

Click the "Load unpacked" button.

Select the folder containing the extension's files (e.g., manifest.json, content.js).

The extension will be installed and ready to use. Navigate to a page with a video (like YouTube) to see it in action.

⚠️ Important Note on API Keys & Billing
This project relies on the Google Gemini API, which is a paid service.

To use the API, you must have a valid Google Cloud project with a billing account enabled.

New Google Cloud users are eligible for a $300 free trial credit, which is more than enough to run and demonstrate this project extensively at no cost.

The application will not function without a valid API key and an active billing account, as it will be rate-limited by the free tier.

► License
This project is licensed under the MIT License. See the LICENSE file for details.
