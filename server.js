// server.js
import "dotenv/config";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import wav from "wav";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import fs from 'fs'; // Import the file system module
import path from 'path'; // Import the path module

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
  let chunkCounter = 0; 

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
        chunkCounter++;

        if (currentBuffer.length === 0) return;

        try {
          const wavBuffer = await pcmChunksToWavBuffer(currentBuffer);
          
          // --- DIAGNOSTIC STEP: Save the audio to a file ---
          const timestamp = Date.now();
          const filePath = path.join(process.cwd(), `debug_audio_${timestamp}.wav`);
          fs.writeFileSync(filePath, wavBuffer);
          console.log(`Saved audio chunk to ${filePath}`);
          // --- END DIAGNOSTIC STEP ---

          if (wavBuffer.length < 2000) return;

          const audioPart = { inlineData: { mimeType: 'audio/wav', data: wavBuffer.toString('base64') } };
          
          const transcriptionPrompt = "Transcribe only the spoken words from this audio. Ignore all music, silence, and non-speech sounds. If no words are spoken, respond with an empty string.";
          const transcriptionResult = await geminiModel.generateContent([ transcriptionPrompt, audioPart ]);
          const transcribedText = transcriptionResult.response.text().trim();
          
          if (!transcribedText) {
            console.log("Filtered out non-speech audio.");
            return; 
          }
          console.log("Transcribed:", transcribedText);

          const translationPrompt = `Translate the following text to ${targetLanguage}. Provide only the translated text, without any explanations or conversational filler. Text: "${transcribedText}"`;
          const translationResult = await geminiModel.generateContent(translationPrompt);
          const translatedText = translationResult.response.text().trim();
          console.log("Translated:", translatedText);
          
          const [ttsResponse] = await textToSpeechClient.synthesizeSpeech({
            input: { text: translatedText },
            voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
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
      }, 2500);
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
  ws.onerror = (err) => console.error("WebSocket server error:", err.message);
});

// --- Start Server ---
const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

