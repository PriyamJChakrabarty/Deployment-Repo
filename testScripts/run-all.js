'use strict';
// Master runner — executes all 5 benchmark scripts in the recommended
// order from NUMBER_SCRIPTS.md, then writes a one-page summary log.
//
// Run:  node testScripts/run-all.js

const { spawnSync } = require('child_process');
const path          = require('path');
const fs            = require('fs');
const { Logger }    = require('./utils/logger');

const SCRIPTS = [
  { file: 'measure-worker-blocking.js',        label: 'Script 2 — Worker Blocking',         priority: 1 },
  { file: 'measure-speech-to-visible-text.js', label: 'Script 4 — Speech-to-Visible-Text',  priority: 2 },
  { file: 'profile-audio-pipeline.js',         label: 'Script 1 — Audio Pipeline',          priority: 3 },
  { file: 'measure-transcript-batching.js',    label: 'Script 3 — Transcript Batching',     priority: 4 },
  { file: 'stress-live-recording-session.js',  label: 'Script 5 — Long-Session Reliability',priority: 5 },
];

const ROOT = __dirname;

function hr(char = '─', width = 72) {
  return char.repeat(width);
}

function runScript(file) {
  const scriptPath = path.join(ROOT, file);
  const t0         = Date.now();
  const result     = spawnSync(process.execPath, [scriptPath], {
    stdio: 'inherit',
    cwd:   path.join(ROOT, '..'),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  return { exit: result.status ?? 0, elapsed, error: result.error };
}

async function main() {
  const log = new Logger('run-all-summary.log');
  log.header('ZUDIA BENCHMARK SUITE — FULL RUN');

  log.section('Execution Plan');
  log.blank();

  const planHeaders = ['Priority', 'Script', 'File'];
  const planRows    = SCRIPTS.map(s => [s.priority, s.label, s.file]);
  log.table(planHeaders, planRows);

  log.blank();
  log.info('Running scripts in the order recommended by NUMBER_SCRIPTS.md …');
  log.blank();

  const results = [];

  for (const script of SCRIPTS) {
    process.stdout.write(`\n${'═'.repeat(72)}\n`);
    process.stdout.write(`  Running: ${script.label}\n`);
    process.stdout.write(`${'═'.repeat(72)}\n\n`);

    const { exit, elapsed, error } = runScript(script.file);
    results.push({ ...script, exit, elapsed, error: error?.message ?? null });
  }

  // ── Summary table ─────────────────────────────────────────────────────────

  log.section('Run Summary');
  log.blank();

  const sumHeaders = ['Priority', 'Script', 'Exit', 'Time', 'Status'];
  const sumRows    = results.map(r => [
    r.priority,
    r.label,
    r.exit,
    `${r.elapsed}s`,
    r.exit === 0 && !r.error ? 'PASS ✔' : 'FAIL ✘',
  ]);
  log.table(sumHeaders, sumRows);
  log.blank();

  const passed  = results.filter(r => r.exit === 0 && !r.error).length;
  const failed  = results.length - passed;
  const total   = results.length;

  passed === total
    ? log.pass(`All ${total}/${total} scripts completed successfully`)
    : log.fail(`${failed} script(s) failed — check individual logs for details`);

  // ── Log file index ────────────────────────────────────────────────────────

  log.section('Log Files Written');
  log.blank();

  const logDir = path.join(ROOT, 'logs');
  if (fs.existsSync(logDir)) {
    const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
    files.forEach(f => log.info(path.join(logDir, f)));
  }

  // ── Interview bullet cheat-sheet ──────────────────────────────────────────

  log.section('Resume Bullet Shapes — Fill In Your Numbers');
  log.blank();
  log.info('From Script 2 (worker-blocking-results.log):');
  log.info('  "Reduced p95 main-thread stalls from X ms to Y ms during WAV export');
  log.info('   by offloading PCM merge and WAV encoding to an inline Web Worker."');
  log.blank();
  log.info('From Script 1 (audio-pipeline-results.log):');
  log.info('  "Kept 3 s mono audio chunk exports within Y ms of the recording boundary');
  log.info('   across Z chunks via browser-side PCM buffering and WAV serialization."');
  log.blank();
  log.info('From Script 4 (speech-to-text-latency-results.log):');
  log.info('  "Held speech-to-visible transcript latency to X s at p50 and Y s at p95');
  log.info('   in repeated live-session trials by chunking audio and optimising export."');
  log.blank();
  log.info('From Script 3 (transcript-batching-results.log):');
  log.info('  "Cut transcript-driven re-renders by X% under 50–250 ms update streams');
  log.info('   by buffering chunks in refs and flushing UI state every 500 ms."');
  log.blank();
  log.info('From Script 5 (stress-session-results.log):');
  log.info('  "Achieved 99%+ successful chunk processing and < 200 ms interval drift');
  log.info('   across 30-min stress sessions with injected upload failures."');

  log.summary('Suite Complete', [
    { label: 'Scripts run',     value: `${total}`, status: 'info'  },
    { label: 'Passed',          value: `${passed}`, status: passed === total ? 'pass' : 'warn' },
    { label: 'Failed',          value: `${failed}`, status: failed === 0 ? 'pass' : 'fail' },
    { label: 'Logs directory',  value: logDir,      status: 'info'  },
  ]);

  log.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
