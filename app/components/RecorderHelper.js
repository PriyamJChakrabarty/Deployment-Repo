"use client";
import Recorder from "./Recorder";

let rec;
let input;
let microphoneStream;
let audioContext;
let chunkInterval;

export async function startContinuousRecording({ onChunkReady, onError }) {
  try {
    console.log("🎧 [RecorderHelper] Requesting microphone access...");
    audioContext =
      audioContext ||
      new (window.AudioContext || window.webkitAudioContext)();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("🎤 [RecorderHelper] Microphone access granted.");

    microphoneStream = stream;
    input = audioContext.createMediaStreamSource(stream);

    rec = new Recorder(input);
    rec.record();

    console.log("🎙️ [RecorderHelper] Continuous recording started.");

    let chunkCount = 0;

    // Export a chunk every 3 seconds
    chunkInterval = setInterval(() => {
      chunkCount++;
      console.log(`⏱️ [RecorderHelper] Exporting chunk #${chunkCount}...`);

      rec.exportWAV((blob) => {
        console.log(
          `💾 [RecorderHelper] Chunk #${chunkCount} ready: ${(blob.size / 1024).toFixed(1)} KB`
        );
        if (onChunkReady) onChunkReady(blob);
      });

      rec.clear();
    }, 3000);
  } catch (err) {
    console.error("❌ [RecorderHelper] Mic access error:", err);
    if (onError) onError(err);
  }
}

export function stopContinuousRecording() {
  try {
    clearInterval(chunkInterval);
    rec.stop();
    microphoneStream?.getTracks().forEach((t) => t.stop());
    console.log("🛑 [RecorderHelper] Continuous recording stopped.");
  } catch (e) {
    console.error("⚠️ [RecorderHelper] Stop error:", e);
  }
}
