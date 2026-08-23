import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "No prompt" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Step 1: Handle the task with the Antigravity Agent
    const interaction = await ai.interactions.create({
      agent: "antigravity-preview-05-2026",
      input: prompt,
      environment: "remote",
      system_instruction: "You are APEX, a highly advanced AI assistant like JARVIS. You have a deep, resonant voice (similar to Felix from Stray Kids). When the user wakes you up with 'Apex' or 'Hey Apex' without a specific command, respond with a short, polite JARVIS-like greeting such as 'Yes, sir' or 'I am here, what can I do for you?'. You handle tasks for the user efficiently and reply concisely. Since your responses are spoken out loud, do not use long code blocks or complex markdown unless necessary. Keep your responses direct, helpful, and sophisticated."
    }, { timeout: 300000 });

    // Extract agent response text
    let agentText = "";
    if (interaction.steps) {
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          const textContent = step.content?.find((c: any) => c.type === 'text') as any;
          if (textContent && textContent.text) {
            agentText += textContent.text;
          }
        }
      }
    } else if (interaction.output_text) {
      agentText = interaction.output_text;
    }

    if (!agentText) agentText = "Task completed, but I have nothing to say.";

    // To keep TTS efficient, we might strip out heavy markdown or truncate very long outputs
    let spokenText = agentText.replace(/```[\s\S]*?```/g, " I have executed the code block. ").trim();
    if (spokenText.length > 500) {
      spokenText = spokenText.substring(0, 500) + "...";
    }

    // Step 2: Use TTS to speak the response (Zephyr voice for JARVIS-like tone)
    const ttsInteraction = await ai.interactions.create({
      model: 'gemini-3.1-flash-tts-preview',
      input: spokenText,
      response_modalities: ['audio'],
      generation_config: {
        speech_config: [{
          language: "en-us",
          voice: "Charon"
        }]
      } as any
    });

    let audioBase64 = null;
    for (const step of ttsInteraction.steps || []) {
      if (step.type === 'model_output') {
        const audioContent = step.content?.find((c: any) => c.type === 'audio') as any;
        if (audioContent && audioContent.data) {
          // The API returns raw 16-bit PCM at 24000Hz. Browsers cannot play this directly via <audio> tags.
          // We must wrap the raw PCM data in a WAV header.
          const pcmBuffer = Buffer.from(audioContent.data, 'base64');
          const sampleRate = 24000;
          const channels = 1;
          const byteRate = sampleRate * channels * 2;
          const blockAlign = channels * 2;

          const wavHeader = Buffer.alloc(44);
          wavHeader.write("RIFF", 0);
          wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
          wavHeader.write("WAVE", 8);
          wavHeader.write("fmt ", 12);
          wavHeader.writeUInt32LE(16, 16); // chunk size
          wavHeader.writeUInt16LE(1, 20);  // PCM format
          wavHeader.writeUInt16LE(channels, 22);
          wavHeader.writeUInt32LE(sampleRate, 24);
          wavHeader.writeUInt32LE(byteRate, 28);
          wavHeader.writeUInt16LE(blockAlign, 32);
          wavHeader.writeUInt16LE(16, 34); // bits per sample
          wavHeader.write("data", 36);
          wavHeader.writeUInt32LE(pcmBuffer.length, 40);

          const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
          audioBase64 = wavBuffer.toString('base64');
          break;
        }
      }
    }

    return NextResponse.json({
      text: agentText,
      audioBase64
    });

  } catch (error: any) {
    console.error("APEX Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
