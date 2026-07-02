'use strict';
// Script 3 — Transcript Update Batching Impact
// Simulates the 500 ms debounced flush in app/hooks/useLiveTranscript.js
// and compares it against a naive setState-on-every-update approach.
// Cadences tested: 50 / 100 / 250 / 500 / 1000 / 3000 ms
// Session lengths: 60 s and 180 s
//
// Run: node testScripts/measure-transcript-batching.js

const { Logger }             = require('./utils/logger');
const { stats, countAbove, fmt } = require('./utils/stats');

const FLUSH_DELAY_MS  = 500;    // useLiveTranscript.js line 17
const SESSION_LENGTHS = [60, 180]; // seconds
const CADENCES_MS     = [50, 100, 250, 500, 1000, 3000];

// ── Expected reduction math from NUMBER_SCRIPTS.md ────────────────────────
const SPEC_EXPECTED = {
  50:   90,
  100:  80,
  250:  50,
  500:  0,
  1000: 0,
  3000: 0,
};

// ── simulateNaive ──────────────────────────────────────────────────────────
// Every update calls setState immediately.
// Returns number of state flushes.
function simulateNaive(sessionSec, cadenceMs) {
  const durationMs = sessionSec * 1000;
  let   flushes    = 0;
  let   t          = cadenceMs; // first update lands at cadenceMs
  while (t <= durationMs) {
    flushes++;
    t += cadenceMs;
  }
  return flushes;
}

// ── simulateBuffered ───────────────────────────────────────────────────────
// Mirrors useLiveTranscript.js exactly:
//   - bufferRef accumulates incoming chunks
//   - each new chunk clears the pending timeout and schedules a new one
//     for FLUSH_DELAY_MS from now
//   - when the timeout fires, that is one setState (one "render")
// Returns the number of actual flushes and the flush timestamps.
function simulateBuffered(sessionSec, cadenceMs, flushDelayMs) {
  const durationMs = sessionSec * 1000;
  const flushTimes = [];

  let pendingFlushAt = null; // ms at which the next flush is scheduled

  let t = cadenceMs;
  while (t <= durationMs) {
    // A new chunk arrives at time t.
    // Clear the old timeout and schedule a fresh one.
    pendingFlushAt = t + flushDelayMs;
    t += cadenceMs;
  }

  // After all updates have arrived, the last pending flush fires if it is
  // still within the session window (we allow it to fire up to flushDelayMs
  // after the last update, matching real browser behaviour).
  if (pendingFlushAt !== null && pendingFlushAt <= durationMs + flushDelayMs) {
    // Count how many distinct flush events fired during the session.
    // Because every new chunk resets the timer, the only flush that fires
    // is the one scheduled after the last chunk in each burst gap.
    // We replay event-by-event to count accurately.
  }

  // More accurate replay using a tiny event queue:
  const events = [];
  let tick = cadenceMs;
  while (tick <= durationMs) { events.push({ type: 'update', t: tick }); tick += cadenceMs; }

  let flushScheduled = null;
  let flushCount     = 0;
  const processed    = [];

  // Process updates in order, tracking when each timeout would fire.
  // We walk the timeline: for each update, cancel the previous scheduled
  // flush and reschedule.  Between updates, fire any elapsed flushes.
  let cursor = 0;
  for (const ev of events) {
    // Fire any pending flush that expires before this update.
    if (flushScheduled !== null && flushScheduled <= ev.t) {
      flushCount++;
      flushTimes.push(flushScheduled);
      flushScheduled = null;
    }
    // Schedule a new flush.
    flushScheduled = ev.t + flushDelayMs;
  }
  // Fire any remaining pending flush (after last update).
  if (flushScheduled !== null) {
    flushCount++;
    flushTimes.push(flushScheduled);
  }

  return { flushCount, flushTimes };
}

// ── commitTime estimation ─────────────────────────────────────────────────
// React commit time is roughly proportional to the number of DOM nodes
// touched.  We model it as a constant base + a small per-char cost.
// These are illustrative numbers, not measured values.
const BASE_COMMIT_MS  = 0.5;
const PER_CHAR_COST   = 0.00002; // ms per character in the transcript so far
const AVG_CHUNK_CHARS = 40;      // characters per transcript chunk

function estimateCommitTime(chunkIndex) {
  const transcriptLen = chunkIndex * AVG_CHUNK_CHARS;
  return BASE_COMMIT_MS + transcriptLen * PER_CHAR_COST;
}

// ── main ──────────────────────────────────────────────────────────────────
async function run() {
  const log = new Logger('transcript-batching-results.log');
  log.header('SCRIPT 3 — TRANSCRIPT UPDATE BATCHING IMPACT');

  log.section('Configuration');
  log.blank();
  log.metric('Flush delay (useLiveTranscript)',  `${FLUSH_DELAY_MS} ms`);
  log.metric('Session lengths tested',          SESSION_LENGTHS.map(s => `${s}s`).join(', '));
  log.metric('Update cadences tested',          CADENCES_MS.map(c => `${c}ms`).join(', '));
  log.metric('Chunk duration in production',    '3000 ms', '', 'RecorderHelper.js');
  log.info('Note: production cadence is 3000 ms — the flush delay adds headroom but not reduction there.');

  for (const sessionSec of SESSION_LENGTHS) {
    log.section(`Session length: ${sessionSec}s`);
    log.blank();

    const tableHeaders = [
      'Cadence', 'Naive renders', 'Buffered flushes',
      'Reduction', 'Spec expected', 'Delta vs spec',
    ];
    const tableRows    = [];
    const reductions   = [];

    for (const cadenceMs of CADENCES_MS) {
      const naiveCount    = simulateNaive(sessionSec, cadenceMs);
      const { flushCount} = simulateBuffered(sessionSec, cadenceMs, FLUSH_DELAY_MS);
      const reduction     = naiveCount > 0
        ? ((naiveCount - flushCount) / naiveCount * 100).toFixed(1)
        : '0.0';
      const specPct       = SPEC_EXPECTED[cadenceMs];
      const delta         = (parseFloat(reduction) - specPct).toFixed(1);

      reductions.push(parseFloat(reduction));
      tableRows.push([
        `${cadenceMs} ms`,
        naiveCount,
        flushCount,
        `${reduction}%`,
        `${specPct}%`,
        `${delta > 0 ? '+' : ''}${delta}%`,
      ]);
    }

    log.table(tableHeaders, tableRows);
    log.blank();

    // Bar chart of reductions
    const maxRed = Math.max(...reductions, 1);
    CADENCES_MS.forEach((c, i) => {
      log.bar(`${c}ms cadence`, reductions[i], 100);
    });
    log.blank();

    // Validation: check that 50ms and 100ms cadences show the most reduction
    const reduction50  = reductions[CADENCES_MS.indexOf(50)];
    const reduction500 = reductions[CADENCES_MS.indexOf(500)];
    reduction50 > reduction500
      ? log.pass(`50 ms cadence shows higher reduction (${reduction50.toFixed(1)}%) than 500 ms (${reduction500.toFixed(1)}%) — as expected`)
      : log.warn(`50 ms cadence did not show higher reduction than 500 ms (unexpected)`);

    // Render-thread time estimation
    log.blank();
    log.info(`Estimated commit-time savings at ${sessionSec}s session:`);
    const commitHeaders = ['Cadence', 'Naive total ms', 'Buffered total ms', 'Savings ms', 'Savings %'];
    const commitRows    = [];
    for (const cadenceMs of CADENCES_MS) {
      const naiveCount    = simulateNaive(sessionSec, cadenceMs);
      const { flushCount} = simulateBuffered(sessionSec, cadenceMs, FLUSH_DELAY_MS);
      let naiveTotal = 0, bufTotal = 0;
      for (let i = 1; i <= naiveCount; i++) naiveTotal += estimateCommitTime(i);
      for (let i = 1; i <= flushCount; i++)  bufTotal  += estimateCommitTime(Math.floor(i * (naiveCount / flushCount)));
      const savings   = naiveTotal - bufTotal;
      const savingsPct = naiveTotal > 0 ? (savings / naiveTotal * 100).toFixed(1) : '0.0';
      commitRows.push([
        `${cadenceMs} ms`,
        naiveTotal.toFixed(1),
        bufTotal.toFixed(1),
        savings.toFixed(1),
        `${savingsPct}%`,
      ]);
    }
    log.table(commitHeaders, commitRows);
  }

  // ── Production scenario ─────────────────────────────────────────────────

  log.section('Production Scenario: 3000 ms chunk cadence');
  log.blank();
  log.info('In production, transcript chunks arrive every ~3 s (one WAV chunk → one transcription).');
  log.info(`The 500 ms flush delay is much shorter than the 3 s inter-chunk gap.`);
  log.info('Each chunk triggers its own isolated debounce window → flush fires once per chunk.');
  log.blank();

  for (const sessionSec of SESSION_LENGTHS) {
    const naiveCount    = simulateNaive(sessionSec, 3000);
    const { flushCount} = simulateBuffered(sessionSec, 3000, FLUSH_DELAY_MS);
    const reduction     = naiveCount > 0
      ? ((naiveCount - flushCount) / naiveCount * 100).toFixed(1) : '0.0';

    log.metric(`${sessionSec}s session — naive renders`,    naiveCount);
    log.metric(`${sessionSec}s session — buffered flushes`, flushCount);
    log.metric(`${sessionSec}s session — reduction`,        `${reduction}%`);

    parseFloat(reduction) < 10
      ? log.warn(`Minimal reduction at 3 s cadence — softening this bullet is recommended`)
      : log.pass(`Meaningful reduction even at 3 s cadence`);
    log.blank();
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  const r50_180   = (() => {
    const n = simulateNaive(180, 50);
    const { flushCount: f } = simulateBuffered(180, 50, FLUSH_DELAY_MS);
    return ((n - f) / n * 100).toFixed(1);
  })();
  const r100_180  = (() => {
    const n = simulateNaive(180, 100);
    const { flushCount: f } = simulateBuffered(180, 100, FLUSH_DELAY_MS);
    return ((n - f) / n * 100).toFixed(1);
  })();

  log.summary('Script 3 — Key Results', [
    { label: '50 ms cadence render reduction (180s)',    value: `${r50_180}%`,  status: Number(r50_180) > 60 ? 'pass' : 'warn' },
    { label: '100 ms cadence render reduction (180s)',   value: `${r100_180}%`, status: Number(r100_180) > 50 ? 'pass' : 'warn' },
    { label: 'Production cadence (3000 ms) reduction',   value: '~0%',          status: 'warn' },
    { label: 'Flush delay',                              value: `${FLUSH_DELAY_MS} ms (useLiveTranscript.js)`, status: 'info' },
    { label: 'Strong bullet range',                      value: '50–250 ms update streams', status: 'info' },
    { label: 'Recommendation',                           value: 'Qualify bullet with "under bursty update streams"', status: 'info' },
  ]);

  log.close();
}

run().catch(err => { console.error(err); process.exit(1); });
