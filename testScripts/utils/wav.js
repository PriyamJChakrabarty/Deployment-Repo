'use strict';
// Direct port of the WAV-encoding logic that lives inside the inline
// Web Worker in app/components/Recorder.js.  Keeping the function
// bodies identical means benchmarks here reflect real production cost.

function mergeBuffers(buffers, totalLength) {
  const result = new Float32Array(totalLength);
  let offset = 0;
  buffers.forEach(b => { result.set(b, offset); offset += b.length; });
  return result;
}

function downSampleBuffer(buffer, sourceSampleRate, targetSampleRate) {
  if (targetSampleRate >= sourceSampleRate) return buffer;
  const ratio     = sourceSampleRate / targetSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result    = new Float32Array(newLength);
  let offsetResult = 0, offsetBuffer = 0;
  while (offsetResult < result.length) {
    const next = Math.round((offsetResult + 1) * ratio);
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < next; i++) { accum += buffer[i]; count++; }
    result[offsetResult++] = accum / count;
    offsetBuffer = next;
  }
  return result;
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

// encodeWAV mirrors the worker's encodeWAV exactly.
// Returns a DataView wrapping an ArrayBuffer.
function encodeWAV(samples, sampleRate, numChannels = 1) {
  const buf  = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  writeString(view, 0,  'RIFF');
  view.setUint32(4,  36 + samples.length * 2, true);
  writeString(view, 8,  'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1,            true); // PCM
  view.setUint16(22, numChannels,  true);
  view.setUint32(24, sampleRate,   true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16,           true); // 16-bit
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);
  return view;
}

// Parse a WAV header for validation.
function parseWAVHeader(dataView) {
  const rs = (off, len) => {
    let s = '';
    for (let i = 0; i < len; i++) s += String.fromCharCode(dataView.getUint8(off + i));
    return s;
  };
  return {
    riff:         rs(0, 4),
    fileSize:     dataView.getUint32(4, true) + 8,
    wave:         rs(8, 4),
    fmt:          rs(12, 4),
    fmtSize:      dataView.getUint32(16, true),
    audioFormat:  dataView.getUint16(20, true),
    channels:     dataView.getUint16(22, true),
    sampleRate:   dataView.getUint32(24, true),
    byteRate:     dataView.getUint32(28, true),
    blockAlign:   dataView.getUint16(32, true),
    bitsPerSample:dataView.getUint16(34, true),
    data:         rs(36, 4),
    dataSize:     dataView.getUint32(40, true),
  };
}

// Full pipeline: source PCM → optional downsample → WAV.
// Mirrors the worker's exportWAV case exactly.
function encodeFullPipeline(sourceSampleRate, pcm, numChannels = 1) {
  const targetSampleRate = Math.min(sourceSampleRate, 48000);
  const downsampled      = downSampleBuffer(pcm, sourceSampleRate, targetSampleRate);
  const wavView          = encodeWAV(downsampled, targetSampleRate, numChannels);
  return { wavView, targetSampleRate, sampleCount: downsampled.length };
}

module.exports = {
  mergeBuffers, downSampleBuffer, encodeWAV,
  parseWAVHeader, encodeFullPipeline,
};
