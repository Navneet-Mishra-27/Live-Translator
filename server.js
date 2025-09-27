import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import wav from 'wav';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// --- Initialization ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

if (!process.env.GOOGLE_API_KEY) {
  console.error('FATAL ERROR: GOOGLE_API_KEY is not set in your .env file.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
const textToSpeechClient = new TextToSpeechClient();

const languageToCode = {
  'Spanish': 'es-ES',
  'French': 'fr-FR',
  'German': 'de-DE',
  'Italian': 'it-IT',
  'Portuguese': 'pt-BR',
  'Russian': 'ru-RU',
  'Japanese': 'ja-JP',
  'Korean': 'ko-KR',
  'Chinese': 'cmn-CN',
};

app.get('/', (req, res) => {
  res.send('Subtitle backend with Google Gemini is running!');
});

function pcmChunksToWavBuffer(chunks, sampleRate = 48000) {
  const numChannels = 1;
  const bitDepth = 16;
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);
  const dataSize = chunks.length * chunks[0].length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // Audio format (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitDepth, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      buffer.writeInt16LE(Math.max(-1, Math.min(1, chunk[i])) * 32767, offset);
      offset += 2;
    }
  }

  return buffer;
}

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');
  let audioBuffer = [];
  let accumulationTimer = null;
  let targetLanguage = 'Spanish';

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'setLanguage' && data.language) {
        targetLanguage = data.language;
        console.log(`Target language set to: ${targetLanguage}`);
        return;
      }
    } catch (e) {
      audioBuffer.push(new Float32Array(message));
    }

    if (!accumulationTimer) {
      accumulationTimer = setTimeout(async () => {
        const currentBuffer = [...audioBuffer];
        audioBuffer = [];
        accumulationTimer = null;

        if (currentBuffer.length === 0) {
          return;
        }

        try {
          const wavBuffer = pcmChunksToWavBuffer(currentBuffer);

          const audioPart = {
            inlineData: {
              mimeType: 'audio/wav',
              data: wavBuffer.toString('base64'),
            },
          };

          const transcriptionResult = await geminiModel.generateContent(['Transcribe this audio.', audioPart]);
          const transcribedText = transcriptionResult.response.text().trim();
          console.log('Transcribed:', transcribedText);

          if (!transcribedText) {
            return;
          }

          const translationResult = await geminiModel.generateContent(`Translate the following text to ${targetLanguage}: ${transcribedText}`);
          const translatedText = translationResult.response.text().trim();
          console.log('Translated:', translatedText);

          const [ttsResponse] = await textToSpeechClient.synthesizeSpeech({
            input: { text: translatedText },
            voice: { languageCode: languageToCode[targetLanguage] || 'en-US', ssmlGender: 'NEUTRAL' },
            audioConfig: { audioEncoding: 'MP3' },
          });
          const audioBase64 = ttsResponse.audioContent.toString('base64');

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ translatedText, audioData: audioBase64 }));
          }
        } catch (err) {
          console.error('Error during Google AI API call:', err.message);
        }
      }, 3000);
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
  ws.onerror = (err) => console.error('WebSocket server error:', err.message);
});

const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
