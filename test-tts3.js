const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const res = await ai.interactions.create({
      model: 'gemini-3.1-flash-tts-preview',
      input: 'Testing.',
      response_modalities: ['audio'],
      generation_config: {
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Charon"
            }
          }
        }
      }
    });
    console.log("Success");
  } catch (e) {
    console.error(e.message);
  }
}
test();
