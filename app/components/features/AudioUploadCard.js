"use client";
import { Upload, FileAudio } from "lucide-react";

export default function AudioUploadCard({
  file,
  onFileChange,
  onUpload,
  loading,
}) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Upload className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Upload Audio File</h3>
          <p className="text-gray-600 text-sm">
            Upload and transcribe your meeting recording
          </p>
        </div>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 mb-4 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer">
        <div className="text-center">
          <FileAudio className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          {file ? (
            <div>
              <p className="text-indigo-600 font-semibold">{file}</p>
              <p className="text-gray-500 text-sm mt-1">Click to change file</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-900 font-semibold mb-1">
                Drop your audio file here
              </p>
              <p className="text-gray-600 text-sm">or click to browse</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setLoading(!loading)}
        disabled={loading}
        className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:cursor-not-allowed"
      >
        {loading ? "Transcribing..." : "Upload & Transcribe"}
      </button>
    </div>
  );
}
