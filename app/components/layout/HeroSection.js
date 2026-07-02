"use client";
import { FileAudio, Brain, CheckCircle, Mic } from "lucide-react";

export default function HeroSection({ onStartMeeting }) {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.1) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        ></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-indigo-100 border border-indigo-200 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
            <span className="text-indigo-700 text-sm font-medium">
              AI-Powered Legal Analysis
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Legal Meetings into{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Actionable Insights
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Real-time transcription, intelligent clause mapping, and automated
            action item extraction powered by advanced AI.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={onStartMeeting}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <Mic className="w-5 h-5 inline mr-2" />
              Start Meeting Now
            </button>
            <button className="px-8 py-4 bg-white border border-gray-300 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 rounded-xl font-semibold transition-all">
              Watch Demo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-2xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <FileAudio className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
              <p className="text-gray-900 font-semibold text-2xl">5000+</p>
              <p className="text-gray-600 text-sm">Meetings Analyzed</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <Brain className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <p className="text-gray-900 font-semibold text-2xl">98%</p>
              <p className="text-gray-600 text-sm">Accuracy Rate</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <CheckCircle className="w-8 h-8 text-pink-600 mx-auto mb-3" />
              <p className="text-gray-900 font-semibold text-2xl">5sec</p>
              <p className="text-gray-600 text-sm">Avg. Processing</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
