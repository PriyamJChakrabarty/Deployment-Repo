"use client";
import Recorder from "./Recorder";

let microphoneStream;
let rec;
let input;

export async function startRecording({ audioContext, onStreamLoad, onError }) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphoneStream = stream;
    input = audioContext.createMediaStreamSource(stream);
    rec = new Recorder(input);
    rec.record();
    if (onStreamLoad) onStreamLoad();
    return stream;
  } catch (err) {
    console.error("Mic access error:", err);
    if (onError) onError(err);
  }
}

export function stopRecording({ onWavReady }) {
  if (!rec) return;
  rec.stop();
  microphoneStream?.getAudioTracks()[0]?.stop();

  rec.exportWAV((blob) => {
    console.log("🎙 WAV ready:", blob);
    if (onWavReady) onWavReady(blob);
  });

  rec.clear();
}
