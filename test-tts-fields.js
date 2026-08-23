const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const res = await ai.interactions.create({
      model: 'gemini-3.1-flash-tts-preview',
      input: 'Testing.',
      response_modalities: ['audio'],
      generation_config: {
        speech_config: [{
          language: "en-us",
          voice: "Charon"
        }]
      }
    });
    for (const step of res.steps || []) {
      if (step.type === 'model_output') {
        const audioContent = step.content?.find((c) => c.type === 'audio');
        if (audioContent) {
          console.log("Audio Content Object:", Object.keys(audioContent));
          console.log("Audio Content MimeType (camel/snake):", audioContent.mimeType || audioContent.mime_type);
        }
      }
    }
  } catch (e) {
    console.error(e.message);
  }
}
test();
