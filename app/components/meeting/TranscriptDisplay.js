"use client";

export default function TranscriptDisplay({ transcript }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Live Transcript</h3>
          <p className="text-gray-600 text-sm">
            Real-time transcription with non-blocking updates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-emerald-600 text-sm font-semibold">Live</span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 min-h-[300px]">
        <textarea
          rows="12"
          value={transcript || "Transcript will appear here..."}
          readOnly
          className="w-full h-full bg-transparent text-gray-700 font-mono text-sm leading-relaxed resize-none focus:outline-none"
        />
      </div>
    </div>
  );
}
