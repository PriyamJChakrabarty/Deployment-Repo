"use client";

/**
 * ✅ Inline Worker Creator (replacement for inline-worker package)
 * Generates a Web Worker from a function at runtime.
 */
function createInlineWorker(workerFunction) {
  const code = workerFunction
    .toString()
    .replace(/^(\(\)\s*=>\s*{)|}$/g, ""); // strip wrapper
  const blob = new Blob([code], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  return new Worker(url);
}

export default class Recorder {
  constructor(source, cfg) {
    this.config = {
      bufferLen: 4096,
      numChannels: 1,
      mimeType: "audio/wav",
      ...cfg,
    };
    this.recording = false;
    this.callbacks = { getBuffer: [], exportWAV: [] };
    this.context = source.context;

    // Create the script processor
    this.node = (
      this.context.createScriptProcessor ||
      this.context.createJavaScriptNode
    ).call(
      this.context,
      this.config.bufferLen,
      this.config.numChannels,
      this.config.numChannels
    );

    // Capture microphone buffer frames
    this.node.onaudioprocess = (e) => {
      if (!this.recording) return;
      const buffer = [];
      for (let channel = 0; channel < this.config.numChannels; channel++) {
        buffer.push(e.inputBuffer.getChannelData(channel));
      }
      this.worker.postMessage({ command: "record", buffer });
    };

    source.connect(this.node);
    this.node.connect(this.context.destination);

    // ✅ Inline Web Worker definition
    this.worker = createInlineWorker(() => {
      let recLength = 0,
        recBuffers = [],
        sampleRate,
        numChannels,
        newSampleRate;

      this.onmessage = function (e) {
        switch (e.data.command) {
          case "init":
            sampleRate = e.data.config.sampleRate;
            numChannels = e.data.config.numChannels;
            newSampleRate = sampleRate > 48000 ? 48000 : sampleRate;
            recBuffers = Array.from({ length: numChannels }, () => []);
            break;
          case "record":
            e.data.buffer.forEach((buf, i) => recBuffers[i].push(buf));
            recLength += e.data.buffer[0].length;
            break;
          case "exportWAV":
            const buffers = recBuffers.map((ch) =>
              mergeBuffers(ch, recLength)
            );
            const interleaved =
              numChannels === 2
                ? interleave(buffers[0], buffers[1])
                : buffers[0];
            const downSampled = downSampleBuffer(interleaved, newSampleRate);
            const dataview = encodeWAV(downSampled);
            const blob = new Blob([dataview], { type: e.data.type });
            this.postMessage({ command: "exportWAV", data: blob });
            break;
          case "clear":
            recLength = 0;
            recBuffers = Array.from({ length: numChannels }, () => []);
            break;
        }
      };

      // Utility functions inside worker
      function mergeBuffers(recBuffers, recLength) {
        const result = new Float32Array(recLength);
        let offset = 0;
        recBuffers.forEach((b) => {
          result.set(b, offset);
          offset += b.length;
        });
        return result;
      }

      function interleave(inputL, inputR) {
        const length = inputL.length + inputR.length;
        const result = new Float32Array(length);
        let index = 0,
          inputIndex = 0;
        while (index < length) {
          result[index++] = inputL[inputIndex];
          result[index++] = inputR[inputIndex];
          inputIndex++;
        }
        return result;
      }

      function downSampleBuffer(buffer, rate) {
        if (rate >= sampleRate) return buffer;
        const ratio = sampleRate / rate;
        const newLength = Math.round(buffer.length / ratio);
        const result = new Float32Array(newLength);
        let offsetResult = 0,
          offsetBuffer = 0;
        while (offsetResult < result.length) {
          const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
          let accum = 0,
            count = 0;
          for (let i = offsetBuffer; i < nextOffsetBuffer; i++) {
            accum += buffer[i];
            count++;
          }
          result[offsetResult++] = accum / count;
          offsetBuffer = nextOffsetBuffer;
        }
        return result;
      }

      function floatTo16BitPCM(output, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 2) {
          const s = Math.max(-1, Math.min(1, input[i]));
          output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
      }

      function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      }

      function encodeWAV(samples) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        writeString(view, 0, "RIFF");
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(view, 8, "WAVE");
        writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, newSampleRate, true);
        view.setUint32(28, newSampleRate * numChannels * 2, true);
        view.setUint16(32, numChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, "data");
        view.setUint32(40, samples.length * 2, true);
        floatTo16BitPCM(view, 44, samples);
        return view;
      }
    });

    // Initialize worker
    this.worker.postMessage({
      command: "init",
      config: {
        sampleRate: this.context.sampleRate,
        numChannels: this.config.numChannels,
      },
    });

    this.worker.onmessage = (e) => {
      const cb = this.callbacks[e.data.command].pop();
      if (typeof cb === "function") cb(e.data.data);
    };
  }

  // 🔘 Public Methods
  record() {
    this.recording = true;
  }

  stop() {
    this.recording = false;
  }

  clear() {
    this.worker.postMessage({ command: "clear" });
  }

  exportWAV(cb, mimeType) {
    mimeType = mimeType || this.config.mimeType;
    this.callbacks.exportWAV.push(cb);
    this.worker.postMessage({ command: "exportWAV", type: mimeType });
  }
}
