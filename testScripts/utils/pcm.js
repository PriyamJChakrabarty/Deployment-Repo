'use strict';

// silence: flat zero signal, the cheapest possible encode workload.
function silence(sampleRate, durationSec) {
  return new Float32Array(Math.floor(sampleRate * durationSec));
}

// tone: pure sine wave at freqHz — deterministic, compresses well.
function tone(sampleRate, durationSec, freqHz = 440) {
  const len = Math.floor(sampleRate * durationSec);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = 0.5 * Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  }
  return out;
}

// noise: white noise at given amplitude — worst-case encode payload.
function noise(sampleRate, durationSec, amplitude = 0.1) {
  const len = Math.floor(sampleRate * durationSec);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = (Math.random() * 2 - 1) * amplitude;
  }
  return out;
}

// simulateCallbacks: mimics how the browser collects onaudioprocess frames
// from a ScriptProcessorNode at bufferLen frames each, then hands them to
// the worker as individual Float32Array chunks.
// Returns the individual callback buffers (for use with mergeBuffers) and
// the theoretical callback count.
function simulateCallbacks(sampleRate, durationSec, bufferLen, audioType = 'silence') {
  const totalSamples = Math.floor(sampleRate * durationSec);
  const callbacks    = [];
  let written        = 0;
  let phase          = 0;

  while (written < totalSamples) {
    const len = Math.min(bufferLen, totalSamples - written);
    const buf = new Float32Array(len);

    if (audioType === 'tone') {
      for (let i = 0; i < len; i++) {
        buf[i] = 0.5 * Math.sin((2 * Math.PI * 440 * (written + i)) / sampleRate);
      }
    } else if (audioType === 'noise') {
      for (let i = 0; i < len; i++) buf[i] = (Math.random() * 2 - 1) * 0.1;
    }
    // silence: zeros by default

    callbacks.push(buf);
    written += len;
  }

  return {
    callbacks,
    callbackCount:     callbacks.length,
    theoreticalCbRate: sampleRate / bufferLen,
  };
}

module.exports = { silence, tone, noise, simulateCallbacks };
