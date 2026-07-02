'use strict';
// Script 4 — End-to-End Speech-To-Visible-Text Latency
// Models the full pipeline latency from audio-capture start to transcript
// paint.  WAV encode time is measured directly; every other stage is
// simulated with realistic configurable ranges.
//
// Pipeline stages (in order):
//   1. chunk window      3000 ms   (RecorderHelper.js)
//   2. WAV encode        measured  (Recorder.js worker)
//   3. upload round-trip simulated (network)
//   4. transcription     simulated (Whisper / backend)
//   5. UI flush          500 ms    (useLiveTranscript.js)
//   6. paint             ~16 ms    (next frame)
//
// Structural floor = 3000 + 500 = 3500 ms (before network + model time).
//
// Run: node testScripts/measure-speech-to-visible-text.js

const { performance }                          = require('perf_hooks');
const { Logger }                               = require('./utils/logger');
const { encodeFullPipeline, mergeBuffers }     = require('./utils/wav');
const { simulateCallbacks }                    = require('./utils/pcm');
const { stats, countAbove, fmt }              = require('./utils/stats');

const SAMPLE_RATE    = 48000;
const BUFFER_LEN     = 4096;
const CHUNK_DURATION = 3.0;    // seconds
const FLUSH_DELAY_MS = 500;    // useLiveTranscript.js
const PAINT_BUDGET   = 16.7;   // ms — one 60 Hz frame
const RUNS           = 50;

// Network + backend latency distributions (ms).
// Low / typical / high bands used to model different conditions.
const SCENARIOS = [
  { name: 'Ideal network',   uploadMs: [80, 150],   transcriptMs: [400,  700]  },
  { name: 'Typical network', uploadMs: [150, 350],  transcriptMs: [700,  1200] },
  { name: 'Slow network',    uploadMs: [500, 1200], transcriptMs: [1000, 2000] },
];

// ── helpers ───────────────────────────────────────────────────────────────

function randBetween(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

function measureEncodeMs(sampleRate, audioType = 'noise') {
  const { callbacks } = simulateCallbacks(sampleRate, CHUNK_DURATION, BUFFER_LEN, audioType);
  const totalLen      = callbacks.reduce((s, b) => s + b.length, 0);
  const merged        = mergeBuffers(callbacks, totalLen);
  const t0            = performance.now();
  encodeFullPipeline(sampleRate, merged, 1);
  return performance.now() - t0;
}

// Simulate one full utterance journey, returning a breakdown of each stage.
function simulateUtterance({ uploadRange, transcriptRange }) {
  const chunkWindowMs  = CHUNK_DURATION * 1000;
  const encodeMs       = measureEncodeMs(SAMPLE_RATE, 'noise');
  const uploadMs       = randBetween(...uploadRange);
  const transcriptMs   = randBetween(...transcriptRange);
  const flushMs        = FLUSH_DELAY_MS;
  const paintMs        = PAINT_BUDGET;

  // speech-start → transcript-visible
  const total = chunkWindowMs + encodeMs + uploadMs + transcriptMs + flushMs + paintMs;

  // chunk-end → transcript-visible (excludes the 3s recording window)
  const chunkEndToVisible = encodeMs + uploadMs + transcriptMs + flushMs + paintMs;

  return {
    chunkWindowMs,
    encodeMs,
    uploadMs,
    transcriptMs,
    flushMs,
    paintMs,
    total,
    chunkEndToVisible,
  };
}

// ── main ──────────────────────────────────────────────────────────────────
async function run() {
  const log = new Logger('speech-to-text-latency-results.log');
  log.header('SCRIPT 4 — END-TO-END SPEECH-TO-VISIBLE-TEXT LATENCY');

  log.section('Architecture Constants');
  log.blank();
  log.metric('Chunk window (RecorderHelper.js)',    `${CHUNK_DURATION * 1000} ms`);
  log.metric('Flush delay (useLiveTranscript.js)',  `${FLUSH_DELAY_MS} ms`);
  log.metric('Structural floor (chunk + flush)',    `${CHUNK_DURATION * 1000 + FLUSH_DELAY_MS} ms`, '', 'before network + model');
  log.metric('Paint budget (60 Hz frame)',          `${PAINT_BUDGET.toFixed(1)} ms`);
  log.metric('Utterances per scenario',             RUNS);
  log.blank();
  log.info('WAV encode times are measured in-process; all other stages are simulated.');

  // ── Measure encode overhead alone (warm) ──────────────────────────────────

  log.section('WAV Encode Overhead Baseline');
  log.blank();
  const encodeTimes = [];
  for (let i = 0; i < 100; i++) encodeTimes.push(measureEncodeMs(SAMPLE_RATE, 'noise'));
  const encSt = stats(encodeTimes);

  log.metric('Encode p50',  fmt(encSt.p50), 'ms');
  log.metric('Encode p95',  fmt(encSt.p95), 'ms');
  log.metric('Encode max',  fmt(encSt.max), 'ms');
  log.metric('Encode mean', fmt(encSt.mean), 'ms');
  log.blank();
  encSt.p95 < 50
    ? log.pass(`Encode overhead p95 ${fmt(encSt.p95)} ms — well under 50 ms long-task threshold`)
    : log.warn(`Encode overhead p95 ${fmt(encSt.p95)} ms — may occasionally cross 50 ms long-task threshold`);

  // ── Per-scenario simulation ───────────────────────────────────────────────

  for (const scenario of SCENARIOS) {
    log.section(`Scenario: ${scenario.name}`);
    log.blank();
    log.info(`Upload range:       ${scenario.uploadMs[0]}–${scenario.uploadMs[1]} ms`);
    log.info(`Transcription range: ${scenario.transcriptMs[0]}–${scenario.transcriptMs[1]} ms`);
    log.blank();

    const totals         = [];
    const chunkEndTos    = [];
    const encodeTimes2   = [];
    const uploadTimes    = [];
    const transcriptTimes= [];

    for (let i = 0; i < RUNS; i++) {
      const u = simulateUtterance({
        uploadRange:     scenario.uploadMs,
        transcriptRange: scenario.transcriptMs,
      });
      totals.push(u.total);
      chunkEndTos.push(u.chunkEndToVisible);
      encodeTimes2.push(u.encodeMs);
      uploadTimes.push(u.uploadMs);
      transcriptTimes.push(u.transcriptMs);
    }

    const tSt  = stats(totals);
    const ceSt = stats(chunkEndTos);
    const uSt  = stats(uploadTimes);
    const trSt = stats(transcriptTimes);

    const breakdownHeaders = ['Stage', 'p50 ms', 'p95 ms', 'max ms', '% of total p50'];
    const breakdownRows    = [
      ['1. Chunk window',   `${CHUNK_DURATION * 1000}`, `${CHUNK_DURATION * 1000}`, `${CHUNK_DURATION * 1000}`,
        `${((CHUNK_DURATION * 1000) / tSt.p50 * 100).toFixed(1)}%`],
      ['2. WAV encode',     fmt(stats(encodeTimes2).p50), fmt(stats(encodeTimes2).p95), fmt(stats(encodeTimes2).max),
        `${(stats(encodeTimes2).p50 / tSt.p50 * 100).toFixed(1)}%`],
      ['3. Upload RTT',     fmt(uSt.p50), fmt(uSt.p95), fmt(uSt.max),
        `${(uSt.p50 / tSt.p50 * 100).toFixed(1)}%`],
      ['4. Transcription',  fmt(trSt.p50), fmt(trSt.p95), fmt(trSt.max),
        `${(trSt.p50 / tSt.p50 * 100).toFixed(1)}%`],
      ['5. UI flush',       `${FLUSH_DELAY_MS}`, `${FLUSH_DELAY_MS}`, `${FLUSH_DELAY_MS}`,
        `${(FLUSH_DELAY_MS / tSt.p50 * 100).toFixed(1)}%`],
      ['6. Paint',          fmt(PAINT_BUDGET), fmt(PAINT_BUDGET), fmt(PAINT_BUDGET),
        `${(PAINT_BUDGET / tSt.p50 * 100).toFixed(1)}%`],
      ['─── TOTAL ───',     fmt(tSt.p50), fmt(tSt.p95), fmt(tSt.max), '100%'],
    ];

    log.table(breakdownHeaders, breakdownRows);
    log.blank();

    log.metric('speech-start → visible p50',   fmt(tSt.p50 / 1000, 3), 's');
    log.metric('speech-start → visible p95',   fmt(tSt.p95 / 1000, 3), 's');
    log.metric('chunk-end    → visible p50',   fmt(ceSt.p50 / 1000, 3), 's');
    log.metric('chunk-end    → visible p95',   fmt(ceSt.p95 / 1000, 3), 's');
    log.blank();

    const browserOverhead = stats(encodeTimes2).p95 + FLUSH_DELAY_MS + PAINT_BUDGET;
    log.metric('Browser-side overhead (encode + flush + paint) p95',
      fmt(browserOverhead), 'ms', 'above the structural floor');

    // Target checks
    const under4s_p50 = tSt.p50 / 1000 < 4.5;
    const under6s_p95 = tSt.p95 / 1000 < 6.0;

    under4s_p50
      ? log.pass(`p50 ${fmt(tSt.p50 / 1000, 3)}s — within the 4.0–4.5s interview target`)
      : log.warn(`p50 ${fmt(tSt.p50 / 1000, 3)}s — outside the 4.0–4.5s target for this scenario`);
    under6s_p95
      ? log.pass(`p95 ${fmt(tSt.p95 / 1000, 3)}s — within the 5.0–6.0s interview target`)
      : log.warn(`p95 ${fmt(tSt.p95 / 1000, 3)}s — outside the 5.0–6.0s target for this scenario`);

    // Visualise total latency bar chart
    log.blank();
    const maxTotal = tSt.max;
    const stages = [
      ['Chunk window', CHUNK_DURATION * 1000],
      ['WAV encode p50', stats(encodeTimes2).p50],
      ['Upload p50', uSt.p50],
      ['Transcription p50', trSt.p50],
      ['UI flush', FLUSH_DELAY_MS],
      ['Paint', PAINT_BUDGET],
    ];
    stages.forEach(([label, val]) => log.bar(label, val, maxTotal));
  }

  // ── Cross-scenario comparison ─────────────────────────────────────────────

  log.section('Cross-Scenario Comparison');
  log.blank();

  const crossHeaders = ['Scenario', 'p50 s', 'p95 s', 'In 4.5s target?', 'In 6s target?'];
  const crossRows    = [];

  for (const scenario of SCENARIOS) {
    const totals = [];
    for (let i = 0; i < RUNS; i++) {
      const u = simulateUtterance({
        uploadRange:     scenario.uploadMs,
        transcriptRange: scenario.transcriptMs,
      });
      totals.push(u.total);
    }
    const st = stats(totals);
    crossRows.push([
      scenario.name,
      fmt(st.p50 / 1000, 2),
      fmt(st.p95 / 1000, 2),
      st.p50 / 1000 < 4.5 ? 'YES ✔' : 'NO ✘',
      st.p95 / 1000 < 6.0 ? 'YES ✔' : 'NO ✘',
    ]);
  }

  log.table(crossHeaders, crossRows);

  // ── Summary ─────────────────────────────────────────────────────────────

  const ideal = (() => {
    const totals = [];
    for (let i = 0; i < RUNS; i++) {
      totals.push(simulateUtterance({
        uploadRange: SCENARIOS[0].uploadMs,
        transcriptRange: SCENARIOS[0].transcriptMs,
      }).total);
    }
    return stats(totals);
  })();

  log.summary('Script 4 — Key Results', [
    { label: 'Structural floor (before network)',       value: `${(CHUNK_DURATION * 1000 + FLUSH_DELAY_MS)} ms (3.5 s)`, status: 'info' },
    { label: 'Ideal network p50',                       value: `${fmt(ideal.p50 / 1000, 2)} s`, status: ideal.p50 / 1000 < 4.5 ? 'pass' : 'warn' },
    { label: 'Ideal network p95',                       value: `${fmt(ideal.p95 / 1000, 2)} s`, status: ideal.p95 / 1000 < 6.0 ? 'pass' : 'warn' },
    { label: 'Browser encode + flush overhead p95',     value: `< ${(encSt.p95 + FLUSH_DELAY_MS + PAINT_BUDGET).toFixed(0)} ms`, status: 'pass' },
    { label: 'Target: p50 under 4.0–4.5 s',            value: '(ideal network only)',  status: 'info' },
    { label: 'Target: p95 under 5.0–6.0 s',            value: '(ideal network only)',  status: 'info' },
  ]);

  log.close();
}

run().catch(err => { console.error(err); process.exit(1); });
