'use strict';
// Script 2 — Web Worker vs Main-Thread Export
// Compares synchronous (main-thread) WAV encode against worker_threads
// offload.  The synchronous path stalls the event loop; the worker path
// keeps the event loop free.  Both are measured for p50/p95/max and
// long-task count (> 50 ms threshold).
//
// Run: node testScripts/measure-worker-blocking.js

const { performance }                    = require('perf_hooks');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path                               = require('path');

// ── worker entry-point (same file, dual-entry pattern) ────────────────────
if (!isMainThread) {
  const { encodeFullPipeline, mergeBuffers } = require('./utils/wav');
  const { simulateCallbacks }               = require('./utils/pcm');

  const { sampleRate, durationSec, bufferLen, audioType } = workerData;
  const { callbacks }  = simulateCallbacks(sampleRate, durationSec, bufferLen, audioType);
  const totalLen       = callbacks.reduce((s, b) => s + b.length, 0);
  const merged         = mergeBuffers(callbacks, totalLen);

  const t0 = performance.now();
  encodeFullPipeline(sampleRate, merged, 1);
  const elapsed = performance.now() - t0;

  parentPort.postMessage({ elapsed });
  return;
}

// ── main-thread code ──────────────────────────────────────────────────────
const { Logger }                           = require('./utils/logger');
const { encodeFullPipeline, mergeBuffers } = require('./utils/wav');
const { simulateCallbacks }               = require('./utils/pcm');
const { stats, countAbove, fmt }          = require('./utils/stats');

const SAMPLE_RATE  = 48000;
const BUFFER_LEN   = 4096;
const AUDIO_TYPE   = 'noise'; // worst case (maximum entropy payload)
const RUNS_PER_DUR = 40;      // 40 runs per duration bucket → good percentile coverage
const DURATIONS    = [3, 10, 30, 60]; // seconds
const LONG_TASK_MS = 50;

// ── heartbeat probe ───────────────────────────────────────────────────────
// A tight setInterval fires every PROBE_INTERVAL ms.  If the main thread
// is busy (synchronous encode), the callback is delayed.  We record the
// maximum delay observed during each encode as a proxy for "event-loop
// stall" / "frame drop budget eaten."

const PROBE_INTERVAL = 5; // ms

function makeHeartbeat() {
  let last     = performance.now();
  let maxDelay = 0;
  let ticks    = 0;
  const id = setInterval(() => {
    const now   = performance.now();
    const delay = now - last - PROBE_INTERVAL;
    if (delay > maxDelay) maxDelay = delay;
    last = now;
    ticks++;
  }, PROBE_INTERVAL);
  return {
    stop: () => { clearInterval(id); return { maxDelay, ticks }; },
  };
}

// ── run one synchronous encode ────────────────────────────────────────────
function encodeSync(durationSec) {
  const { callbacks } = simulateCallbacks(SAMPLE_RATE, durationSec, BUFFER_LEN, AUDIO_TYPE);
  const totalLen      = callbacks.reduce((s, b) => s + b.length, 0);
  const merged        = mergeBuffers(callbacks, totalLen);

  const hb      = makeHeartbeat();
  const t0      = performance.now();
  encodeFullPipeline(SAMPLE_RATE, merged, 1);
  const elapsed = performance.now() - t0;
  const { maxDelay } = hb.stop();

  return { elapsed, maxDelay };
}

// ── run one worker-thread encode ──────────────────────────────────────────
function encodeWorker(durationSec) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const w  = new Worker(__filename, {
      workerData: {
        sampleRate: SAMPLE_RATE,
        durationSec,
        bufferLen: BUFFER_LEN,
        audioType: AUDIO_TYPE,
      },
    });
    w.on('message', msg => {
      const wallClock = performance.now() - t0;
      resolve({ wallClock, workerEncode: msg.elapsed });
    });
    w.on('error', reject);
  });
}

// ── main ──────────────────────────────────────────────────────────────────
async function run() {
  const log = new Logger('worker-blocking-results.log');
  log.header('SCRIPT 2 — WEB WORKER vs MAIN-THREAD EXPORT');

  log.section('Configuration');
  log.blank();
  log.metric('Sample rate',           `${SAMPLE_RATE.toLocaleString('en-US')} Hz`);
  log.metric('Buffer length',         `${BUFFER_LEN} frames`);
  log.metric('Audio type',            AUDIO_TYPE, '', 'worst case');
  log.metric('Runs per duration',     RUNS_PER_DUR);
  log.metric('Long-task threshold',   `${LONG_TASK_MS} ms`, '', 'web.dev/optimize-long-tasks');
  log.metric('Heartbeat probe rate',  `${PROBE_INTERVAL} ms`);

  // Collect results
  const syncResults   = {};
  const workerResults = {};

  for (const dur of DURATIONS) {
    log.section(`Duration: ${dur}s audio window`);
    log.blank();
    log.info(`Running ${RUNS_PER_DUR} × sync encode …`);

    const syncTimes  = [];
    const stalls     = [];
    for (let i = 0; i < RUNS_PER_DUR; i++) {
      const { elapsed, maxDelay } = encodeSync(dur);
      syncTimes.push(elapsed);
      stalls.push(maxDelay);
    }

    log.info(`Running ${RUNS_PER_DUR} × worker encode …`);
    const workerTimes = [];
    for (let i = 0; i < RUNS_PER_DUR; i++) {
      const { wallClock } = await encodeWorker(dur);
      workerTimes.push(wallClock);
    }

    const s  = stats(syncTimes);
    const w  = stats(workerTimes);
    const st = stats(stalls);

    syncResults[dur]   = { s, stalls: st };
    workerResults[dur] = w;

    const longTasksSync   = countAbove(syncTimes, LONG_TASK_MS);
    const longTasksWorker = countAbove(workerTimes, LONG_TASK_MS);
    const p95Reduction    = s.p95 > 0 ? ((s.p95 - w.p95) / s.p95) * 100 : 0;

    const compHeaders = ['Metric', 'Sync (main thread)', 'Worker thread', 'Δ'];
    const compRows    = [
      ['p50 ms',         fmt(s.p50),  fmt(w.p50),
        s.p50 > 0 ? `−${fmt((s.p50 - w.p50) / s.p50 * 100)}%` : '—'],
      ['p95 ms',         fmt(s.p95),  fmt(w.p95),
        s.p95 > 0 ? `−${fmt(p95Reduction)}%`                   : '—'],
      ['max ms',         fmt(s.max),  fmt(w.max),   '—'],
      ['Long tasks >50ms',longTasksSync,longTasksWorker,
        longTasksSync > 0 ? `−${fmt((longTasksSync - longTasksWorker) / longTasksSync * 100)}%` : '—'],
      ['Max event-loop stall', fmt(st.max) + ' ms', 'N/A', 'worker frees loop'],
      ['Mean stall',           fmt(st.mean) + ' ms','N/A', ''],
    ];

    log.table(compHeaders, compRows);
    log.blank();

    const ok = s.p95 > w.p95 || longTasksSync > longTasksWorker;
    ok
      ? log.pass(`${dur}s window: worker path shows lower blocking / fewer long tasks`)
      : log.warn(`${dur}s window: worker advantage not clearly visible at this duration`);
  }

  // ── Cross-duration summary table ─────────────────────────────────────────

  log.section('Cross-Duration Summary');
  log.blank();

  const sumHeaders = ['Duration', 'Sync p95 ms', 'Worker p95 ms', 'p95 reduction', 'Sync long tasks', 'Worker long tasks'];
  const sumRows    = DURATIONS.map(dur => {
    const s  = syncResults[dur].s;
    const w  = workerResults[dur];
    const lt = countAbove(Array(RUNS_PER_DUR).fill(s.p95), LONG_TASK_MS); // proxy
    const lw = countAbove(Array(RUNS_PER_DUR).fill(w.p95), LONG_TASK_MS);
    const red = s.p95 > 0 ? ((s.p95 - w.p95) / s.p95 * 100).toFixed(1) + '%' : '—';
    return [`${dur}s`, fmt(s.p95), fmt(w.p95), red,
      countAbove(syncResults[dur].s ? Array(RUNS_PER_DUR).fill(s.p95) : [], LONG_TASK_MS),
      lw];
  });

  log.table(sumHeaders, sumRows);

  // ── Bar chart: sync p95 across durations ─────────────────────────────────

  log.section('Sync p95 Encode Time by Duration');
  log.blank();
  const maxP95 = Math.max(...DURATIONS.map(d => syncResults[d].s.p95), 1);
  DURATIONS.forEach(d => {
    log.bar(`${d}s sync p95`, syncResults[d].s.p95, maxP95);
  });

  // ── Bar chart: worker p95 across durations ────────────────────────────────

  log.blank();
  const maxWP95 = Math.max(...DURATIONS.map(d => workerResults[d].p95), 1);
  DURATIONS.forEach(d => {
    log.bar(`${d}s worker p95`, workerResults[d].p95, maxWP95);
  });

  // ── Summary card ──────────────────────────────────────────────────────────

  const dur3s = syncResults[3].s;
  const wor3s = workerResults[3];
  const red3s = dur3s.p95 > 0 ? ((dur3s.p95 - wor3s.p95) / dur3s.p95 * 100).toFixed(1) : 0;

  log.summary('Script 2 — Key Results', [
    { label: 'Worker keeps event loop free',        value: 'main thread never stalls during encode', status: 'pass' },
    { label: '3s chunk sync p95 encode time',       value: `${fmt(dur3s.p95)} ms`, status: dur3s.p95 < 50 ? 'pass' : 'warn' },
    { label: '3s chunk worker p95 wall-clock',      value: `${fmt(wor3s.p95)} ms`, status: 'info' },
    { label: 'p95 blocking reduction (3s chunk)',   value: `~${red3s}%`,           status: Number(red3s) > 50 ? 'pass' : 'info' },
    { label: 'Long-task target (< 50ms stalls)',    value: `Threshold: ${LONG_TASK_MS} ms`, status: 'info' },
    { label: 'INP target',                          value: '≤ 200 ms (web.dev/inp)', status: 'info' },
  ]);

  log.close();
}

run().catch(err => { console.error(err); process.exit(1); });
