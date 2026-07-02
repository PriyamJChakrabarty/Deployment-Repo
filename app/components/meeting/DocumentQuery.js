"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import axios from "axios";

export default function DocumentQuery() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    {
      type: "assistant",
      text: "Hello! I'm your employee and database assistant. Ask me anything about employees, documents, legal clauses, or any information stored in our databases.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const API_URL = "http://localhost:8000/api/query-docs";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!query.trim() || loading) return;

    const userMessage = {
      type: "user",
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    try {
      const response = await axios.post(
        API_URL,
        {
          query: userMessage.text,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const assistantMessage = {
        type: "assistant",
        text: response.data.answer,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Full error:", err);
      console.error("Error response:", err.response);

      let errorText = "An error occurred while processing your query.";

      if (err.response) {
        errorText =
          err.response.data?.detail || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorText =
          "Cannot connect to server. Please ensure the backend is running on http://localhost:8000";
      } else {
        errorText = err.message;
      }

      const errorMessage = {
        type: "error",
        text: errorText,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-gray-200">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Database Assistant
          </h3>
          <p className="text-sm text-gray-500">
            Ask about employees, documents & database records
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`flex items-start space-x-2 max-w-[85%] ${
                message.type === "user"
                  ? "flex-row-reverse space-x-reverse"
                  : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === "user"
                    ? "bg-gray-200"
                    : message.type === "error"
                    ? "bg-red-100"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600"
                }`}
              >
                {message.type === "user" ? (
                  <User className="w-5 h-5 text-gray-600" />
                ) : (
                  <Bot
                    className={`w-5 h-5 ${
                      message.type === "error" ? "text-red-600" : "text-white"
                    }`}
                  />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`px-4 py-3 rounded-2xl ${
                  message.type === "user"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                    : message.type === "error"
                    ? "bg-red-50 text-red-900 border border-red-200"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap mb-1">
                  {message.text}
                </p>
                <span className="text-xs opacity-70">{message.timestamp}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center space-x-2 pt-4 border-t border-gray-200"
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about employees or database records..."
          disabled={loading}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm text-gray-900 placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
