import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000";

export async function sendAudioChunk(chunkBlob) {
  const formData = new FormData();
  formData.append("file", chunkBlob, "chunk.webm");

  const res = await axios.post(`${BASE_URL}/transcribe/chunk`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data.partial_text || "";
}

export async function analyzeTranscript(transcript) {
  const body = { transcript };

  const [extractRes, actionsRes, clausesRes] = await Promise.all([
    axios.post(`${BASE_URL}/api/extract`, body),
    axios.post(`${BASE_URL}/api/actions`, body),
    axios.post(`${BASE_URL}/api/map_clauses`, body),
  ]);

  return {
    extract: extractRes.data,   // { table, raw }
    actions: actionsRes.data,   // { actions, raw }
    clauses: clausesRes.data,   // whatever your map_clauses returns
  };
}
