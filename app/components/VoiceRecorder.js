"use client";
import React, { useState } from "react";
import {
  startContinuousRecording,
  stopContinuousRecording,
} from "./RecorderHelper";

export default function VoiceRecorder({
  onTranscriptUpdate,
  onRecordingStateChange,
}) {
  const [recording, setRecording] = useState(false);

  const handleStart = async () => {
    console.log("🎙️ [VoiceRecorder] Starting continuous recording...");
    setRecording(true);

    // ✅ Notify parent component that recording started
    if (onRecordingStateChange) {
      onRecordingStateChange(true);
    }

    await startContinuousRecording({
      onChunkReady: async (blob) => {
        console.log(
          "📤 [VoiceRecorder] Exported new 3s chunk:",
          blob,
          `(${(blob.size / 1024).toFixed(1)} KB)`
        );

        const formData = new FormData();
        const filename = `chunk-${Date.now()}.wav`;
        formData.append("file", blob, filename);

        try {
          console.log(`🚀 [VoiceRecorder] Sending chunk → ${filename}`);
          const res = await fetch("http://127.0.0.1:8000/transcribe/chunk", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          console.log("✅ [VoiceRecorder] Backend response:", data);

          if (data.partial_text && data.partial_text.trim().length > 0) {
            console.log(
              "🧠 [VoiceRecorder] Appending partial text:",
              `"${data.partial_text.trim()}"`
            );
            onTranscriptUpdate(data.partial_text.trim());
          } else {
            console.warn("⚠️ [VoiceRecorder] No text returned for chunk");
          }
        } catch (err) {
          console.error("❌ [VoiceRecorder] Chunk upload error:", err);
        }
      },
      onError: (err) => {
        console.error("🎙️ [VoiceRecorder] Microphone access failed:", err);
        alert("Microphone access failed");
        setRecording(false);

        // ✅ Notify parent that recording stopped due to error
        if (onRecordingStateChange) {
          onRecordingStateChange(false);
        }
      },
    });
  };

  const handleStop = () => {
    console.log("🛑 [VoiceRecorder] Stopping continuous recording...");
    stopContinuousRecording();
    setRecording(false);

    // ✅ Notify parent component that recording stopped
    if (onRecordingStateChange) {
      onRecordingStateChange(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={recording ? handleStop : handleStart}
        className={`w-full px-6 py-4 rounded-xl font-semibold shadow-lg transition-all transform hover:scale-105 ${
          recording
            ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white"
            : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white"
        }`}
      >
        {recording ? (
          <span className="flex items-center justify-center">
            <span className="w-3 h-3 bg-white rounded-full mr-3 animate-pulse"></span>
            ⏹ Stop Live Transcription
          </span>
        ) : (
          <span className="flex items-center justify-center">
            🎙 Start Live Transcription
          </span>
        )}
      </button>

      {recording && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-75"></span>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-150"></span>
            </div>
            <p className="text-green-400 font-medium">
              Live recording — sending 3s chunks continuously
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
