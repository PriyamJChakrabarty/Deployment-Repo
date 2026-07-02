"use client";
import Recorder from "./Recorder";

let rec;
let input;
let microphoneStream;
let audioContext;
let chunkInterval;

export async function startContinuousRecording({ onChunkReady, onError }) {
  try {
    audioContext =
      audioContext ||
      new (window.AudioContext || window.webkitAudioContext)();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphoneStream = stream;
    input = audioContext.createMediaStreamSource(stream);

    rec = new Recorder(input);
    rec.record();

    console.log("🎙️ Continuous recording started.");

    // Export a chunk every 3 seconds
    chunkInterval = setInterval(() => {
      rec.exportWAV((blob) => {
        if (onChunkReady) onChunkReady(blob);
      });
      rec.clear(); // clear internal buffer for next chunk
    }, 3000);
  } catch (err) {
    console.error("⚠️ Mic access error:", err);
    if (onError) onError(err);
  }
}

export function stopContinuousRecording() {
  try {
    clearInterval(chunkInterval);
    rec.stop();
    microphoneStream?.getTracks().forEach((t) => t.stop());
    console.log("⏹️ Continuous recording stopped.");
  } catch (e) {
    console.error("⚠️ Stop error:", e);
  }
}
