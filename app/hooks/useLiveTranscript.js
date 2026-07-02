"use client";
import { useState, useRef } from "react";

export function useLiveTranscript() {
  const [displayText, setDisplayText] = useState("");
  const bufferRef = useRef("");
  const timeoutRef = useRef(null);

  const appendText = (newChunk) => {
    if (!newChunk || typeof newChunk !== "string") return;
    console.log("📥 [useLiveTranscript] Received new chunk:", `"${newChunk}"`);

    bufferRef.current += newChunk.trim() + " ";

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setDisplayText(bufferRef.current);
      console.log("🖋️ [useLiveTranscript] Transcript updated in UI:", bufferRef.current);
    }, 500);
  };

  const resetTranscript = () => {
    bufferRef.current = "";
    setDisplayText("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    console.log("🧹 [useLiveTranscript] Transcript reset");
  };

  return { transcript: displayText, appendText, resetTranscript };
}
