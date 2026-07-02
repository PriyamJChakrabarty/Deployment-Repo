"use client";
import { useState } from "react";
import { Upload, FileAudio } from "lucide-react";
import axios from "axios";

export default function AudioUploadSection() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const uploadAudio = async () => {
    if (!file) {
      alert("Please select an audio file first!");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/transcribe",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      alert("Transcription completed!");
      console.log(res.data);
    } catch (err) {
      console.error("Transcription error:", err);
      alert("Transcription failed.");
    }

    setLoading(false);
  };

  return (
    <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Upload Pre-recorded Audio
              </h2>
              <p className="text-gray-600 text-sm">
                Transcribe and analyze existing meeting recordings
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 mb-4 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFile}
              className="hidden"
              id="audio-upload-home"
            />
            <label htmlFor="audio-upload-home" className="cursor-pointer block">
              <div className="text-center">
                <FileAudio className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                {file ? (
                  <div>
                    <p className="text-indigo-600 font-semibold text-lg">
                      {file.name}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Click to change file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-900 font-semibold text-lg mb-2">
                      Drop your audio file here
                    </p>
                    <p className="text-gray-600">or click to browse</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Supports MP3, WAV, M4A up to 500MB
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          <button
            onClick={uploadAudio}
            disabled={loading || !file}
            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Transcribing...
              </span>
            ) : (
              "Upload & Transcribe"
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
