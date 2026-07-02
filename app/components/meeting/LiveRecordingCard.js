"use client";
import { Mic } from "lucide-react";
import VoiceRecorder from "../VoiceRecorder";

export default function LiveRecordingCard({
  onTranscriptUpdate,
  onRecordingStateChange,
}) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200 shadow-lg">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <Mic className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Live Recording</h3>
          <p className="text-gray-600 text-sm">
            Record and transcribe in real-time
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        {/* ✅ Pass both props to VoiceRecorder */}
        <VoiceRecorder
          onTranscriptUpdate={onTranscriptUpdate}
          onRecordingStateChange={onRecordingStateChange}
        />
      </div>
    </div>
  );
}
