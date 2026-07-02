'use strict';
// Script 5 — Long-Session Reliability
// Simulates 10-min, 20-min, and 30-min recording sessions at the 3 s chunk
// cadence.  Each chunk is encoded in-process; upload is simulated with
// realistic latency + injected failures.  Tracks timing drift, memory
// growth, and end-to-end success rate.
//
// Run: node testScripts/stress-live-recording-session.js

const { performance }                       = require('perf_hooks');
const { Logger }                            = require('./utils/logger');
const { encodeFullPipeline, mergeBuffers }  = require('./utils/wav');
const { simulateCallbacks }                 = require('./utils/pcm');
const { stats, countAbove, fmt }            = require('./utils/stats');

const SAMPLE_RATE     = 48000;
const BUFFER_LEN      = 4096;
const CHUNK_DURATION  = 3.0;   // seconds
const AUDIO_TYPE      = 'noise'; // worst-case encode

// Session lengths (minutes) → chunk counts
const SESSIONS = [
  { label: '10-min session', minutes: 10 },
  { label: '20-min session', minutes: 20 },
  { label: '30-min session', minutes: 30 },
];

// Failure injection rates
const UPLOAD_FAIL_RATE    = 0.02;  // 2% of uploads fail
const TIMING_ANOMALY_RATE = 0.01;  // 1% of chunk intervals have a spike
const TIMING_SPIKE_MS     = 250;   // extra ms added on spike

// Upload simulation
const UPLOAD_LATENCY_MS = [100, 400]; // range

function randBetween(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

// Encode one 3 s chunk and return the time taken.
function encodeOneChunk() {
  const { callbacks } = simulateCallbacks(SAMPLE_RATE, CHUNK_DURATION, BUFFER_LEN, AUDIO_TYPE);
  const totalLen      = callbacks.reduce((s, b) => s + b.length, 0);
  const merged        = mergeBuffers(callbacks, totalLen);
  const t0            = performance.now();
  encodeFullPipeline(SAMPLE_RATE, merged, 1);
  return performance.now() - t0;
}

// Simulate uploading a chunk (returns elapsed ms, may "fail").
function simulateUpload() {
  const latency = randBetween(...UPLOAD_LATENCY_MS);
  const failed  = Math.random() < UPLOAD_FAIL_RATE;
  return { latency, failed };
}

// Run one full simulated session.
function runSession({ minutes }) {
  const totalChunks   = Math.floor((minutes * 60) / CHUNK_DURATION);
  const encodeTimes   = [];
  const intervalTimes = [];   // nominal is 3000 ms, deviations = drift
  const uploadTimes   = [];
  const memory        = [];   // heapUsed snapshots, MiB

  let chunksFailed     = 0;
  let emptyTranscripts = 0;
  let lastChunkStart   = performance.now();

  for (let i = 0; i < totalChunks; i++) {
    const chunkStart = performance.now();
    const interval   = chunkStart - lastChunkStart;
    if (i > 0) intervalTimes.push(interval);
    lastChunkStart   = chunkStart;

    // Encode
    const encMs = encodeOneChunk();
    encodeTimes.push(encMs);

    // Simulate upload
    const { latency, failed } = simulateUpload();
    uploadTimes.push(latency);
    if (failed) {
      chunksFailed++;
    } else {
      // Simulate ~3% empty transcription responses (server returned blank)
      if (Math.random() < 0.03) emptyTranscripts++;
    }

    // Inject timing anomaly
    if (Math.random() < TIMING_ANOMALY_RATE) {
      // We don't actually sleep; we record the spike as extra overhead
      intervalTimes[intervalTimes.length - 1] =
        (intervalTimes[intervalTimes.length - 1] || 0) + TIMING_SPIKE_MS;
    }

    // Memory snapshot every 20 chunks
    if (i % 20 === 0) {
      memory.push(process.memoryUsage().heapUsed / (1024 * 1024));
    }
  }

  const successRate = ((totalChunks - chunksFailed) / totalChunks * 100).toFixed(2);

  // Drift: deviation of each interval from the target 3000 ms
  const TARGET_INTERVAL_MS = CHUNK_DURATION * 1000;
  const drifts             = intervalTimes.map(t => Math.abs(t - TARGET_INTERVAL_MS));

  return {
    totalChunks,
    chunksFailed,
    emptyTranscripts,
    successRate,
    encodeStats:    stats(encodeTimes),
    uploadStats:    stats(uploadTimes),
    driftStats:     stats(drifts),
    intervalStats:  stats(intervalTimes),
    memStart:       memory[0]  ?? 0,
    memEnd:         memory[memory.length - 1] ?? 0,
    memPeak:        Math.max(...memory),
    memGrowth:      (memory[memory.length - 1] ?? 0) - (memory[0] ?? 0),
    memSamples:     memory,
  };
}

// ── main ──────────────────────────────────────────────────────────────────
async function run() {
  const log = new Logger('stress-session-results.log');
  log.header('SCRIPT 5 — LONG-SESSION RELIABILITY');

  log.section('Configuration');
  log.blank();
  log.metric('Sample rate',         `${SAMPLE_RATE.toLocaleString('en-US')} Hz`);
  log.metric('Chunk duration',      `${CHUNK_DURATION} s`);
  log.metric('Audio type',          AUDIO_TYPE, '', 'worst-case for encode');
  log.metric('Upload fail rate',    `${(UPLOAD_FAIL_RATE * 100).toFixed(0)}%`, '', 'injected');
  log.metric('Timing anomaly rate', `${(TIMING_ANOMALY_RATE * 100).toFixed(0)}%`, '', 'injected');
  log.metric('Timing spike size',   `${TIMING_SPIKE_MS} ms`);
  log.metric('Empty transcript rate','~3%', '', 'injected');

  const sessionResults = [];

  for (const session of SESSIONS) {
    log.section(session.label);
    log.blank();
    log.info(`Simulating ${session.minutes} min → ${Math.floor(session.minutes * 60 / CHUNK_DURATION)} chunks …`);

    const r = runSession(session);
    sessionResults.push({ ...session, ...r });

    log.blank();

    // Per-session details table
    const detailHeaders = ['Metric', 'Value', 'Target / Note'];
    const detailRows    = [
      ['Total chunks',            r.totalChunks.toLocaleString('en-US'),    '—'],
      ['Successful uploads',      (r.totalChunks - r.chunksFailed).toLocaleString('en-US'), '—'],
      ['Failed uploads',          r.chunksFailed.toLocaleString('en-US'),   `${UPLOAD_FAIL_RATE * 100}% injected`],
      ['Empty transcriptions',    r.emptyTranscripts.toLocaleString('en-US'), '~3% injected'],
      ['Chunk success rate',      `${r.successRate}%`,               '≥ 99% target'],
      ['Encode p50',              `${fmt(r.encodeStats.p50)} ms`,    '< 50 ms (long-task threshold)'],
      ['Encode p95',              `${fmt(r.encodeStats.p95)} ms`,    '< 50 ms'],
      ['Interval drift p50',      `${fmt(r.driftStats.p50)} ms`,     '< 100 ms target'],
      ['Interval drift p95',      `${fmt(r.driftStats.p95)} ms`,     '< 200 ms target'],
      ['Interval drift max',      `${fmt(r.driftStats.max)} ms`,     '—'],
      ['Memory start',            `${r.memStart.toFixed(1)} MiB`,    '—'],
      ['Memory end',              `${r.memEnd.toFixed(1)} MiB`,      '—'],
      ['Memory peak',             `${r.memPeak.toFixed(1)} MiB`,     '—'],
      ['Memory growth',           `${r.memGrowth.toFixed(1)} MiB`,   'bounded = pass'],
    ];

    log.table(detailHeaders, detailRows);
    log.blank();

    // Status checks
    const successOk = parseFloat(r.successRate) >= 99.0;
    const driftOk   = r.driftStats.p95 < 200;
    const memOk     = r.memGrowth < 20; // MiB

    successOk
      ? log.pass(`${session.label}: ${r.successRate}% chunk success rate — meets ≥ 99% target`)
      : log.fail(`${session.label}: ${r.successRate}% success rate — below 99% target`);

    driftOk
      ? log.pass(`${session.label}: interval drift p95 ${fmt(r.driftStats.p95)} ms — within 200 ms`)
      : log.warn(`${session.label}: interval drift p95 ${fmt(r.driftStats.p95)} ms — above 200 ms`);

    memOk
      ? log.pass(`${session.label}: memory growth ${r.memGrowth.toFixed(1)} MiB — bounded`)
      : log.warn(`${session.label}: memory growth ${r.memGrowth.toFixed(1)} MiB — may indicate a leak`);

    // Bar chart: encode overhead over time
    log.blank();
    const encMax = Math.max(r.encodeStats.max, 1);
    log.bar('Encode p50', r.encodeStats.p50, encMax);
    log.bar('Encode p95', r.encodeStats.p95, encMax);
    log.bar('Encode max', r.encodeStats.max, encMax);
    log.blank();

    // Drift bar chart
    const driftMax = Math.max(r.driftStats.max, 1);
    log.bar('Drift p50', r.driftStats.p50, driftMax);
    log.bar('Drift p95', r.driftStats.p95, driftMax);
    log.bar('Drift max', r.driftStats.max, driftMax);
  }

  // ── Cross-session comparison table ───────────────────────────────────────

  log.section('Cross-Session Comparison');
  log.blank();

  const crossHeaders = [
    'Session', 'Chunks', 'Success %', 'Drift p95 ms', 'Mem growth MiB', '≥99%?', 'Drift OK?',
  ];
  const crossRows = sessionResults.map(r => [
    r.label,
    r.totalChunks.toLocaleString('en-US'),
    `${r.successRate}%`,
    fmt(r.driftStats.p95),
    r.memGrowth.toFixed(1),
    parseFloat(r.successRate) >= 99.0 ? 'YES ✔' : 'NO ✘',
    r.driftStats.p95 < 200 ? 'YES ✔' : 'NO ✘',
  ]);

  log.table(crossHeaders, crossRows);
  log.blank();

  // Success-rate bar chart
  const maxRate = 100;
  sessionResults.forEach(r => log.bar(r.label + ' success', parseFloat(r.successRate), maxRate));

  // ── Summary ──────────────────────────────────────────────────────────────

  const allSuccessOk = sessionResults.every(r => parseFloat(r.successRate) >= 99.0);
  const allDriftOk   = sessionResults.every(r => r.driftStats.p95 < 200);
  const allMemOk     = sessionResults.every(r => r.memGrowth < 20);
  const r30          = sessionResults.find(r => r.minutes === 30);

  log.summary('Script 5 — Key Results', [
    { label: 'All sessions ≥ 99% chunk success',
      value: allSuccessOk ? 'YES' : 'PARTIAL',
      status: allSuccessOk ? 'pass' : 'warn' },
    { label: 'All sessions drift p95 < 200 ms',
      value: allDriftOk ? 'YES' : 'PARTIAL',
      status: allDriftOk ? 'pass' : 'warn' },
    { label: 'Memory growth bounded (< 20 MiB)',
      value: allMemOk ? 'YES' : 'PARTIAL',
      status: allMemOk ? 'pass' : 'warn' },
    { label: '30-min session success rate',
      value: r30 ? `${r30.successRate}%` : 'n/a',
      status: r30 && parseFloat(r30.successRate) >= 99 ? 'pass' : 'warn' },
    { label: '30-min drift p95',
      value: r30 ? `${fmt(r30.driftStats.p95)} ms` : 'n/a',
      status: r30 && r30.driftStats.p95 < 200 ? 'pass' : 'warn' },
    { label: 'Upload fail rate injected',
      value: `${UPLOAD_FAIL_RATE * 100}%`,
      status: 'info' },
    { label: 'Target (interview bullet)',
      value: '99%+ chunks / drift < 100–200 ms / bounded memory',
      status: 'info' },
  ]);

  log.close();
}

run().catch(err => { console.error(err); process.exit(1); });
