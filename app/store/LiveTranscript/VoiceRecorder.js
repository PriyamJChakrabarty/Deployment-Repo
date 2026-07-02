"use client";
import React, { useState } from "react";
import {
  startContinuousRecording,
  stopContinuousRecording,
} from "./RecorderHelper";

export default function VoiceRecorder({ onTranscriptUpdate }) {
  const [recording, setRecording] = useState(false);

  const handleStart = async () => {
    setRecording(true);

    await startContinuousRecording({
      onChunkReady: async (blob) => {
        console.log("🎧 Sending 3s chunk to backend:", blob);

        const formData = new FormData();
        formData.append("file", blob, `chunk-${Date.now()}.wav`);

        try {
          const res = await fetch("http://127.0.0.1:8000/transcribe/chunk", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Transcription failed");
          const data = await res.json();

          if (data.partial_text && data.partial_text.trim().length > 0) {
            console.log("🧠 Partial text:", data.partial_text);
            onTranscriptUpdate(data.partial_text.trim());
          }
        } catch (err) {
          console.error("⚠️ Chunk upload error:", err);
        }
      },
      onError: (err) => {
        console.error("Mic error:", err);
        alert("Microphone access failed");
        setRecording(false);
      },
    });
  };

  const handleStop = () => {
    stopContinuousRecording();
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
        {recording ? "⏹ Stop Streaming" : "🎙 Start Live Transcription"}
      </button>

      {recording && (
        <p style={{ color: "green", marginTop: "10px" }}>
          🔴 Live — sending 3 s chunks every interval
        </p>
      )}
    </div>
  );
}
