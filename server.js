// server.js
import "dotenv/config";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import wav from "wav";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

// --- Initialization ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Check for API Key at startup
if (!process.env.GOOGLE_API_KEY) {
  console.error("FATAL ERROR: GOOGLE_API_KEY is not set in your .env file.");
  process.exit(1);
}

// Initialize Google AI Clients
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
const textToSpeechClient = new TextToSpeechClient();

app.get("/", (req, res) => {
  res.send("Subtitle backend with Google Gemini is running!");
});

// --- Helper Functions ---
function pcmChunksToWavBuffer(chunks) {
  return new Promise((resolve, reject) => {
    try {
      const writer = new wav.Writer({ channels: 1, sampleRate: 44100, bitDepth: 16 });
      const buffers = [];
      writer.on("data", (data) => buffers.push(data));
      writer.on("finish", () => resolve(Buffer.concat(buffers)));
      writer.on("error", reject);
      for (const chunk of chunks) {
        writer.write(Buffer.from(chunk));
      }
      writer.end();
    } catch (e) {
      reject(e);
    }
  });
}

// --- WebSocket Logic ---
wss.on("connection", (ws) => {
  console.log("Client connected via WebSocket");
  let audioBuffer = [];
  let accumulationTimer = null;
  let targetLanguage = "Spanish";

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'setLanguage' && data.language) {
        targetLanguage = data.language;
        console.log(`Target language set to: ${targetLanguage}`);
        return;
      }
    } catch (e) {
      audioBuffer.push(message);
    }

    if (!accumulationTimer) {
      accumulationTimer = setTimeout(async () => {
        const currentBuffer = [...audioBuffer];
        audioBuffer = [];
        accumulationTimer = null;
        if (currentBuffer.length === 0) return;

        try {
          // 1. Convert audio buffer to WAV
          const wavBuffer = await pcmChunksToWavBuffer(currentBuffer);
          if (wavBuffer.length < 1000) return;

          // 2. Transcription with Gemini
          const audioPart = { inlineData: { mimeType: 'audio/wav', data: wavBuffer.toString('base64') } };
          const transcriptionResult = await geminiModel.generateContent([ "Transcribe this audio.", audioPart ]);
          const transcribedText = transcriptionResult.response.text().trim();
          console.log("Transcribed:", transcribedText);
          if (!transcribedText) return;

          // 3. Translation with Gemini
          const translationResult = await geminiModel.generateContent(`Translate the following text to ${targetLanguage}: ${transcribedText}`);
          const translatedText = translationResult.response.text().trim();
          console.log("Translated:", translatedText);
          
          // 4. Text-to-Speech with Google Cloud TTS
          const [ttsResponse] = await textToSpeechClient.synthesizeSpeech({
            input: { text: translatedText },
            voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' }, // You can change this voice
            audioConfig: { audioEncoding: 'MP3' },
          });
          const audioBase64 = ttsResponse.audioContent.toString('base64');
          
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ translatedText, audioData: audioBase64 }));
          }

        } catch (err) {
          console.error("========================================");
          console.error("Error during Google AI API call:", err.message);
          console.error("========================================");
        }
      }, 5000);
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
  ws.onerror = (err) => console.error("WebSocket server error:", err.message);
});

// --- Start Server ---
const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));