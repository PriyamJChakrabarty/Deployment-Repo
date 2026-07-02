"use client";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useUser } from "@clerk/nextjs";
import { Mail } from "lucide-react";

// Layout Components
import Navbar from "../components/layout/Navbar";

// Meeting Components
import LiveRecordingCard from "../components/meeting/LiveRecordingCard";
import TranscriptDisplay from "../components/meeting/TranscriptDisplay";
import AnalysisControl from "../components/meeting/AnalysisControl";
import DataTable from "../components/meeting/DataTable";
import ChatbotSection from "../components/meeting/ChatbotSection";
import DBViewer from "../components/meeting/DBViewer";
import SuggestChangesSection from "../components/meeting/SuggestChangesSection";

// Hooks
import { useLiveTranscript } from "../hooks/useLiveTranscript";

// Helper function
const fetchMappedClauses = async (extractedItems) => {
  const mappingPromises = extractedItems.map(async (item, i) => {
    const query = item.Description || item.Clause;
    if (!query) return null;

    try {
      const mapRes = await axios.post("http://localhost:8000/api/map_clauses", {
        description: query,
      });
      return { key: String(i), clauses: mapRes.data.related_clauses };
    } catch (err) {
      console.error(`Error mapping clause for: ${query}`, err);
      return null;
    }
  });

  const mappingResultsArray = await Promise.all(mappingPromises);
  const newMappedClauses = {};

  mappingResultsArray
    .filter((r) => r)
    .forEach((r) => {
      newMappedClauses[r.key] = r.clauses;
    });

  return newMappedClauses;
};

export default function MeetingPage() {
  const { user } = useUser();
  const { transcript, appendText, resetTranscript } = useLiveTranscript();
  const [isRecording, setIsRecording] = useState(false);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [extractData, setExtractData] = useState([]);
  const [actionsData, setActionsData] = useState([]);
  const [mappedClauses, setMappedClauses] = useState({});
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [dbRefreshTrigger, setDbRefreshTrigger] = useState(0);

  const autoIntervalRef = useRef(null);
  const isAnalyzingRef = useRef(false);
  const prevRecordingState = useRef(false);

  const analyzeTranscript = async () => {
    if (!transcript.trim()) {
      console.log("⏭️ Skipping analysis (empty transcript)");
      return;
    }

    if (isAnalyzingRef.current) {
      console.log("⏳ Skipping analysis (previous one still running)");
      return;
    }

    console.log("🧠 Starting background analysis...");
    isAnalyzingRef.current = true;
    setLoadingExtract(true);

    try {
      const [res1, res2] = await Promise.all([
        axios.post("http://127.0.0.1:8000/api/extract", { transcript }),
        axios.post("http://127.0.0.1:8000/api/actions", { transcript }),
      ]);

      setExtractData(res1.data.table || []);
      setActionsData(res2.data.actions || []);

      const extractedItems = res1.data.table || [];
      const mappedClausesResult = await fetchMappedClauses(extractedItems);
      setMappedClauses(mappedClausesResult);

      console.log("✅ Auto-analysis complete.");
    } catch (err) {
      console.error("❌ Analysis error:", err.message);
    } finally {
      setLoadingExtract(false);
      isAnalyzingRef.current = false;
    }
  };

  const sendEmailReport = async () => {
    if (!user || !user.emailAddresses || !user.emailAddresses[0]) {
      setEmailStatus({ type: "error", message: "User email not found" });
      return;
    }

    const userEmail = user.emailAddresses[0].emailAddress;

    setSendingEmail(true);
    setEmailStatus(null);

    try {
      const response = await fetch("/api/send-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          transcript: transcript,
          complianceFlags: extractData,
          actionItems: actionsData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Email sent successfully:", data);
        setEmailStatus({
          type: "success",
          message: `Report sent to ${userEmail}`,
        });

        // Clear status after 5 seconds
        setTimeout(() => setEmailStatus(null), 5000);
      } else {
        throw new Error(data.error || "Failed to send email");
      }
    } catch (error) {
      console.error("❌ Error sending email:", error);
      setEmailStatus({
        type: "error",
        message: "Failed to send email. Please try again.",
      });

      // Clear status after 5 seconds
      setTimeout(() => setEmailStatus(null), 5000);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleChangesApplied = () => {
    // Trigger DB refresh by incrementing counter
    setDbRefreshTrigger((prev) => prev + 1);
  };

  // Detect when recording stops and send email
  useEffect(() => {
    if (prevRecordingState.current === true && isRecording === false) {
      // Recording just stopped
      console.log("🛑 Recording stopped. Sending email report...");

      // Wait a bit for final analysis to complete
      setTimeout(() => {
        if (transcript.trim()) {
          sendEmailReport();
        }
      }, 1000);
    }

    prevRecordingState.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    if (autoAnalyze && isRecording) {
      console.log("🔁 Auto-analysis started (every 7s)");
      analyzeTranscript();

      autoIntervalRef.current = setInterval(() => {
        analyzeTranscript();
      }, 7000);
    }

    return () => {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
    };
  }, [autoAnalyze, transcript, isRecording]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 pt-28 w-full">
        {/* Email Status Notification */}
        {emailStatus && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              emailStatus.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5" />
              <span className="font-medium">{emailStatus.message}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT SIDE - INDEPENDENTLY SCROLLABLE */}
          <div className="space-y-6">
            <LiveRecordingCard
              onTranscriptUpdate={appendText}
              onRecordingStateChange={setIsRecording}
              isRecording={isRecording}
            />
            {/* <TranscriptDisplay transcript={transcript} /> */}

            {/* Chatbot Section with Tabs */}
            <ChatbotSection />
          </div>

          {/* RIGHT SIDE - INDEPENDENTLY SCROLLABLE */}
          <div className="space-y-6 pb-8">
            <AnalysisControl
              autoAnalyze={autoAnalyze}
              onAutoToggle={setAutoAnalyze}
              onAnalyze={analyzeTranscript}
              loading={loadingExtract}
            />

            {/* Manual Send Email Button */}
            {(extractData.length > 0 || actionsData.length > 0) &&
              !isRecording && (
                <button
                  onClick={sendEmailReport}
                  disabled={sendingEmail}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Mail className="w-5 h-5" />
                  <span>
                    {sendingEmail
                      ? "Sending Report..."
                      : "Send Report to Email"}
                  </span>
                </button>
              )}

            <DataTable
              title="Compliance Flags"
              data={extractData}
              mappedClauses={mappedClauses}
            />

            <DataTable title="Action Items" data={actionsData} />
          </div>
        </div>
      </main>

      {/* DATABASE VIEWER SECTION - FULL WIDTH */}
      <div className="max-w-7xl mx-auto px-6 pb-8 w-full">
        <DBViewer refreshTrigger={dbRefreshTrigger} />
      </div>

      {/* SUGGEST CHANGES SECTION - FULL WIDTH AT BOTTOM */}
      <div className="max-w-7xl mx-auto px-6 pb-8 w-full">
        <SuggestChangesSection
          transcript={transcript}
          isRecording={isRecording}
          onChangesApplied={handleChangesApplied}
        />
      </div>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-600">
              © 2025 Compliance Tracker. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
