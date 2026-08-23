const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const res = await ai.interactions.create({
    model: 'gemini-3.1-flash-tts-preview',
    input: 'Testing.',
    response_modalities: ['audio'],
    generation_config: { speech_config: [{ language: "en-us", voice: "Charon" }] }
  });
  
  let base64Pcm = null;
  let sampleRate = 24000;
  for (const step of res.steps || []) {
    if (step.type === 'model_output') {
      const audioContent = step.content?.find((c) => c.type === 'audio');
      if (audioContent) {
        base64Pcm = audioContent.data;
        console.log(audioContent.mime_type);
        break;
      }
    }
  }
  
  if (base64Pcm) {
    const fs = require('fs');
    // save raw pcm
    fs.writeFileSync('out.pcm', Buffer.from(base64Pcm, 'base64'));
    
    // Add wav header
    const pcmBuffer = Buffer.from(base64Pcm, 'base64');
    const channels = 1;
    const byteRate = sampleRate * channels * 2;
    const blockAlign = channels * 2;

    const wavHeader = Buffer.alloc(44);
    wavHeader.write("RIFF", 0);
    wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
    wavHeader.write("WAVE", 8);
    wavHeader.write("fmt ", 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20);
    wavHeader.writeUInt16LE(channels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(byteRate, 28);
    wavHeader.writeUInt16LE(blockAlign, 32);
    wavHeader.writeUInt16LE(16, 34);
    wavHeader.write("data", 36);
    wavHeader.writeUInt32LE(pcmBuffer.length, 40);

    const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
    fs.writeFileSync('out.wav', wavBuffer);
    console.log("Wrote out.wav. Size:", wavBuffer.length);
  }
}
test();
