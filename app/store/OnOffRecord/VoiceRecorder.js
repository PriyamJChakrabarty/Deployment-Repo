"use client";
import React, { useState } from "react";
import { startRecording, stopRecording } from "./RecorderHelper";

export default function VoiceRecorder({ onTranscriptUpdate }) {
  const [recording, setRecording] = useState(false);
  const [audioContext] = useState(
    typeof window !== "undefined" ? new (window.AudioContext || window.webkitAudioContext)() : null
  );

  const handleStart = async () => {
    await startRecording({
      audioContext,
      onStreamLoad: () => setRecording(true),
      onError: () => alert("Microphone not accessible"),
    });
  };

  const handleStop = () => {
    stopRecording({
      onWavReady: async (blob) => {
        // send blob to backend /transcribe route
        const formData = new FormData();
        formData.append("file", blob, "recording.wav");

        const res = await fetch("http://127.0.0.1:8000/transcribe", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        console.log("🧠 Transcribed:", data);
        onTranscriptUpdate(data.transcript);
      },
    });
    setRecording(false);
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      <button
        onClick={recording ? handleStop : handleStart}
        style={{
          backgroundColor: recording ? "#dc2626" : "#16a34a",
          color: "white",
          border: "none",
          padding: "12px 24px",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold",
        }}
      >
        {recording ? "⏹ Stop Recording" : "🎙 Start Recording"}
      </button>
    </div>
  );
}
