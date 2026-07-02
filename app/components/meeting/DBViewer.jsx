"use client";
import { useState, useEffect } from "react";
import { Database, ChevronDown, ChevronRight, RefreshCw, X, FileText } from "lucide-react";

export default function DBViewer({ refreshTrigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedDocs, setExpandedDocs] = useState({});
  const [expandedClauses, setExpandedClauses] = useState({});

  const fetchDBData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/api/get-db");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDbData(data);
      setIsOpen(true);
    } catch (err) {
      console.error("Error fetching database:", err);
      setError("Failed to load database. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh when refreshTrigger changes and viewer is open
  useEffect(() => {
    if (refreshTrigger > 0 && isOpen) {
      console.log("Auto-refreshing database...");
      fetchDBData();
    }
  }, [refreshTrigger]);

  const toggleDoc = (docId) => {
    setExpandedDocs((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const toggleClause = (docId, clauseId) => {
    const key = `${docId}-${clauseId}`;
    setExpandedClauses((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleRefresh = () => {
    fetchDBData();
  };

  const handleViewDatabase = () => {
    fetchDBData();
  };

  if (!isOpen) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Database Viewer</h2>
              <p className="text-sm text-gray-600">
                View all documents and clauses in the database
              </p>
            </div>
          </div>

          <button
            onClick={handleViewDatabase}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-6 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                <span>View Database</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Database Content</h2>
              <p className="text-sm text-gray-600">
                {dbData ? `${Object.keys(dbData).length} document(s) found` : "Loading..."}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
              title="Refresh Database"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">Loading database...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        ) : dbData && Object.keys(dbData).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(dbData).map(([docId, doc]) => (
              <div
                key={docId}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Document Header */}
                <button
                  onClick={() => toggleDoc(docId)}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    {expandedDocs[docId] ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">
                        {doc.doc_name || "Untitled Document"}
                      </h3>
                      <p className="text-xs text-gray-500">ID: {docId}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                    {doc.doc_type || "Unknown Type"}
                  </span>
                </button>

                {/* Document Details */}
                {expandedDocs[docId] && (
                  <div className="p-4 space-y-4 bg-white">
                    {/* Metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Entity 1:</span>{" "}
                        <span className="text-gray-600">{doc.entity_1_name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Entity 2:</span>{" "}
                        <span className="text-gray-600">{doc.entity_2_name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Execution Date:</span>{" "}
                        <span className="text-gray-600">{doc.execution_date || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Term Length:</span>{" "}
                        <span className="text-gray-600">{doc.term_length || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Termination Notice:</span>{" "}
                        <span className="text-gray-600">{doc.termination_notice || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Fee Structure:</span>{" "}
                        <span className="text-gray-600">{doc.fee_structure || "N/A"}</span>
                      </div>
                      {doc.confidentiality_survival && (
                        <div>
                          <span className="font-semibold text-gray-700">Confidentiality Survival:</span>{" "}
                          <span className="text-gray-600">{doc.confidentiality_survival}</span>
                        </div>
                      )}
                    </div>

                    {/* Clauses */}
                    {doc.clauses && doc.clauses.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                          <span>Clauses</span>
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                            {doc.clauses.length}
                          </span>
                        </h4>
                        <div className="space-y-2">
                          {doc.clauses.map((clause) => {
                            const clauseKey = `${docId}-${clause.clause_id}`;
                            return (
                              <div
                                key={clause.clause_id}
                                className="border border-gray-200 rounded-lg overflow-hidden"
                              >
                                <button
                                  onClick={() => toggleClause(docId, clause.clause_id)}
                                  className="w-full p-3 bg-gray-50 hover:bg-gray-100 transition-all flex items-center justify-between text-left"
                                >
                                  <div className="flex items-center space-x-2">
                                    {expandedClauses[clauseKey] ? (
                                      <ChevronDown className="w-4 h-4 text-gray-600" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-600" />
                                    )}
                                    <span className="font-medium text-gray-900">
                                      {clause.title}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    ID: {clause.clause_id}
                                  </span>
                                </button>

                                {expandedClauses[clauseKey] && (
                                  <div className="p-3 bg-white border-t border-gray-200">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                      {clause.text}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No documents found in database</p>
          </div>
        )}
      </div>
    </div>
  );
}