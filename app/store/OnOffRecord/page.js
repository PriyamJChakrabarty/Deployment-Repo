"use client";
import { useState } from "react";
import axios from "axios";
import DataTable from "./components/DataTable";
// import LiveRecorder from "./components/LiveRecorder"; // ✅ Added import
import VoiceRecorder from "./components/VoiceRecorder";


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

export default function Home() {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [loadingTranscribe, setLoadingTranscribe] = useState(false);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [extractData, setExtractData] = useState([]);
  const [actionsData, setActionsData] = useState([]);
  const [rawExtract, setRawExtract] = useState("");
  const [rawActions, setRawActions] = useState("");
  const [mappedClauses, setMappedClauses] = useState({});

  const handleFile = (e) => {
    setFile(e.target.files[0]);
    setTranscript("");
    setExtractData([]);
    setActionsData([]);
    setRawExtract("");
    setRawActions("");
    setMappedClauses({});
  };

  const uploadAudio = async () => {
    if (!file) return alert("Select an audio file first!");
    setLoadingTranscribe(true);
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
      setTranscript(res.data.transcript);
    } catch (err) {
      alert("Transcription error");
      console.error(err);
    }
    setLoadingTranscribe(false);
  };

  const analyzeTranscript = async () => {
    if (!transcript) return alert("Transcript is empty");
    setLoadingExtract(true);

    let extractedItems = [];
    let mappedClausesResult = {};

    try {
      const res1 = await axios.post("http://127.0.0.1:8000/api/extract", {
        transcript,
      });
      setExtractData(res1.data.table);
      setRawExtract(res1.data.raw);

      extractedItems = res1.data.table;
      mappedClausesResult = await fetchMappedClauses(extractedItems);
      setMappedClauses(mappedClausesResult);

      const res2 = await axios.post("http://127.0.0.1:8000/api/actions", {
        transcript,
      });
      setActionsData(res2.data.actions);
      setRawActions(res2.data.raw);
    } catch (err) {
      alert("Analysis error");
      console.error(err);
    }

    console.log("Extracted Data (Rows):", extractedItems.length);
    console.log(
      "Mapped Clauses (State Keys):",
      Object.keys(mappedClausesResult)
    );

    setLoadingExtract(false);
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Zudia+ | Legal Meeting Analyzer</h1>

      {/* STEP 1: Upload and Transcribe */}
      <section>
        <h2>Step 1: Upload Audio → Transcribe</h2>
        <input type="file" accept="audio/*" onChange={handleFile} />
        <button
          onClick={uploadAudio}
          disabled={loadingTranscribe}
          style={{ marginLeft: "10px" }}
        >
          {loadingTranscribe ? "Transcribing..." : "Upload & Transcribe"}
        </button>
      </section>

      {/* ✅ STEP 1.5: Record Audio Using Recorder.js */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Step 1.5: Record Audio</h2>
        <VoiceRecorder
          onTranscriptUpdate={(newText) =>
            setTranscript((prev) => (prev + " " + newText).trim())
          }
        />
      </section>


      {/* TRANSCRIPT BOX */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Transcript</h2>
        <textarea
          rows="8"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Transcript will appear here..."
          style={{ width: "100%" }}
        />
      </section>

      {/* STEP 2: ANALYSIS */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Step 2: Analyze</h2>
        <button onClick={analyzeTranscript} disabled={loadingExtract}>
          {loadingExtract ? "Analyzing..." : "Extract & Identify Actions"}
        </button>
      </section>

      {/* TABLES */}
      <DataTable
        title="Extracted Key Legal Points"
        data={extractData}
        mappedClauses={mappedClauses}
      />
      {rawExtract && (
        <details>
          <summary>Raw Gemini Extract Response</summary>
          <pre>{rawExtract}</pre>
        </details>
      )}

      <DataTable title="Action Items" data={actionsData} />
      {rawActions && (
        <details>
          <summary>Raw Gemini Actions Response</summary>
          <pre>{rawActions}</pre>
        </details>
      )}
    </main>
  );
}