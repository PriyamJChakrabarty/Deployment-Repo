"use client";
import { useState } from "react";
import {
  Lightbulb,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function SuggestChangesSection({
  transcript,
  isRecording,
  onChangesApplied,
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [selectedChanges, setSelectedChanges] = useState({});
  const [applying, setApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchSuggestions = async () => {
    if (!transcript.trim()) {
      setError("No transcript available to analyze");
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestions([]);
    setSelectedChanges({});
    setSuccessMessage(null);

    try {
      const response = await fetch(
        "http://localhost:8000/api/suggest-changes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcript: transcript,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);

      // Initialize all suggestions as selected by default
      const initialSelection = {};
      data.suggestions.forEach((_, index) => {
        initialSelection[index] = true;
      });
      setSelectedChanges(initialSelection);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setError("Failed to fetch suggestions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (index) => {
    setSelectedChanges((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const applySelectedChanges = async () => {
    const approvedChanges = suggestions.filter(
      (_, index) => selectedChanges[index]
    );

    if (approvedChanges.length === 0) {
      setError("No changes selected to apply");
      return;
    }

    setApplying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("http://localhost:8000/api/apply-changes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approved_changes: approvedChanges,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Show success message
      setSuccessMessage(
        `✅ Success! ${result.changes_applied} change${
          result.changes_applied !== 1 ? "s" : ""
        } applied to the database.`
      );

      // Clear suggestions
      setSuggestions([]);
      setSelectedChanges({});

      // Notify parent component to refresh DB viewer
      if (onChangesApplied) {
        onChangesApplied();
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Error applying changes:", err);
      setError("Failed to apply changes. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  const getOperationColor = (operationType) => {
    switch (operationType) {
      case "MODIFY_METADATA":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "MODIFY_CLAUSE":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "ADD_CLAUSE":
        return "bg-green-100 text-green-800 border-green-300";
      case "DELETE_CLAUSE":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const formatValue = (value) => {
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value || "N/A");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Lightbulb className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Suggest Changes</h2>
            <p className="text-sm text-gray-600">
              Analyze transcript and suggest document updates
            </p>
          </div>
        </div>

        <button
          onClick={fetchSuggestions}
          disabled={loading || isRecording || !transcript.trim()}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-6 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Lightbulb className="w-5 h-5" />
              <span>Suggest Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <p className="text-sm text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Suggestions List */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-700">
              Found {suggestions.length} suggested change
              {suggestions.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={applySelectedChanges}
              disabled={
                applying || Object.values(selectedChanges).every((v) => !v)
              }
              className="bg-green-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Apply Selected Changes</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 transition-all ${
                  selectedChanges[index]
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <button
                      onClick={() => toggleSelection(index)}
                      className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        selectedChanges[index]
                          ? "bg-indigo-600 border-indigo-600"
                          : "bg-white border-gray-300 hover:border-indigo-400"
                      }`}
                    >
                      {selectedChanges[index] && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full border ${getOperationColor(
                            suggestion.operation_type
                          )}`}
                        >
                          {suggestion.operation_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          Doc ID: {suggestion.doc_id}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-3 italic">
                        {suggestion.reasoning}
                      </p>

                      {/* Details based on operation type */}
                      <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-2 text-sm">
                        {suggestion.target_field && (
                          <div>
                            <span className="font-semibold text-gray-700">
                              Field:
                            </span>{" "}
                            <span className="text-gray-600">
                              {suggestion.target_field}
                            </span>
                          </div>
                        )}

                        {suggestion.target_clause_id && (
                          <div>
                            <span className="font-semibold text-gray-700">
                              Clause ID:
                            </span>{" "}
                            <span className="text-gray-600">
                              {suggestion.target_clause_id}
                            </span>
                          </div>
                        )}

                        {suggestion.old_value !== null &&
                          suggestion.old_value !== undefined && (
                            <div>
                              <span className="font-semibold text-gray-700">
                                Old Value:
                              </span>
                              <pre className="mt-1 bg-red-50 p-2 rounded text-xs text-gray-800 whitespace-pre-wrap">
                                {formatValue(suggestion.old_value)}
                              </pre>
                            </div>
                          )}

                        {suggestion.new_value !== null &&
                          suggestion.new_value !== undefined && (
                            <div>
                              <span className="font-semibold text-gray-700">
                                New Value:
                              </span>
                              <pre className="mt-1 bg-green-50 p-2 rounded text-xs text-gray-800 whitespace-pre-wrap">
                                {formatValue(suggestion.new_value)}
                              </pre>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && suggestions.length === 0 && !error && !successMessage && (
        <div className="text-center py-12">
          <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            Click Suggest Changes to analyze the transcript and get document
            update suggestions
          </p>
        </div>
      )}
    </div>
  );
}
