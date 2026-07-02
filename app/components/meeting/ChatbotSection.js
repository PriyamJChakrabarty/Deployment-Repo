"use client";
import { useState } from "react";
import ChatbotCard from "./ChatbotCard";
import DocumentQuery from "./DocumentQuery";

export default function ChatbotSection() {
  const [activeTab, setActiveTab] = useState("legal");

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("legal")}
          className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
            activeTab === "legal"
              ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <span>⚖️</span>
            <span>Legal Assistant</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("database")}
          className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
            activeTab === "database"
              ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <span>📊</span>
            <span>Database Assistant</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "legal" ? <ChatbotCard /> : <DocumentQuery />}
      </div>
    </div>
  );
}
