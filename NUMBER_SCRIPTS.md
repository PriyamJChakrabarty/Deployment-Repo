# NUMBER_SCRIPTS.md

## Goal

Define the benchmark scripts we should build before turning the audio pipeline, Web Worker, and transcript-update work into resume bullets.

This document is intentionally optimized for:

- numbers that sound strong in interviews,
- numbers that are still defensible if someone asks how they were measured,
- benchmark references from primary sources,
- bullet shapes that can later be rewritten into your resume tone.

## What The Code Already Gives Us

These are factual numbers already visible in the codebase:

- audio chunks are exported every `3.0s` in `app/components/RecorderHelper.js`
- transcript UI flush is delayed by `500 ms` in `app/hooks/useLiveTranscript.js`
- auto-analysis runs every `7.0s` in `app/meeting/page.js`
- the recorder uses `createScriptProcessor(4096, 1, 1)` in `app/components/Recorder.js`
- recording is `mono` (`1` channel) in `app/components/Recorder.js`
- output is `16-bit WAV` in `app/components/Recorder.js`
- sample rate is capped to `48 kHz` before WAV export in `app/components/Recorder.js`

## Derived Numbers We Can Use For Assertions

These are math-derived and should be used by the future scripts as expected-value checks:

- at `48,000 Hz` with `4096` frames, the browser should trigger about `11.72` audio callbacks per second
- at `44,100 Hz` with `4096` frames, the browser should trigger about `10.77` audio callbacks per second
- a `3s` mono `48 kHz`, `16-bit` WAV chunk should be about `288,044 bytes`, or `281.3 KiB`
- a `3s` mono `44.1 kHz`, `16-bit` WAV chunk should be about `264,644 bytes`, or `258.4 KiB`
- mono `48 kHz`, `16-bit` PCM is `96,000 bytes/s`, about `93.8 KiB/s`

These are useful for validating the scripts, but they are not impact metrics by themselves.

## External Benchmark Targets

These are the benchmarks the scripts should compare against.

### UI Responsiveness

- any task above `50 ms` is a long task
- on a `60 Hz` display, the browser only gets about `16.7 ms` per frame
- in practice, JavaScript work should stay closer to `10 ms` or less if we want headroom for layout and paint
- a good INP is `<= 200 ms`
- INP from `200-500 ms` means the experience needs improvement

### Browser Audio Constraints

- `createScriptProcessor()` buffer sizes are limited to values such as `256`, `512`, `1024`, `2048`, `4096`, `8192`, `16384`
- lower buffer sizes reduce latency but raise glitch risk
- `createScriptProcessor()` is deprecated, so our strongest story should be stability and reliability, not pretending it is the newest audio path

### Worker Framing

- the main advantage of Web Workers is not guaranteed raw throughput speedup
- the strongest measurement is usually lower main-thread blocking, fewer long tasks, and steadier interaction latency during heavy processing

## Script 1: Audio Pipeline Validation

### Suggested Name

`scripts/perf/profile-audio-pipeline.js`

### Purpose

Measure the browser-side recording path before any server-side transcription logic matters.

### What The Script Should Test

- actual `AudioContext.sampleRate`
- `AudioContext.baseLatency` if exposed by the browser
- real `onaudioprocess` callback cadence under idle conditions
- callback cadence under CPU stress
- chunk duration stability around the `3.0s` target
- WAV header correctness
- encoded sample rate written into the WAV
- channel count written into the WAV
- chunk payload size distribution
- malformed export rate over repeated runs

### Test Matrix

- `44.1 kHz` browser session if available
- `48 kHz` browser session if available
- silence
- speech
- noisy background audio
- `100`, `500`, and `1000` chunk export runs

### Metrics To Capture

- callback rate
- callback jitter
- chunk-ready overhead after each `3.0s` boundary
- malformed WAV rate
- chunk-size min, max, p50, p95
- export success rate

### Interview-Friendly Number Bands If Results Go Well

- `0%` malformed WAV exports across `500-1000+` chunks
- callback cadence held near `10.8-11.7` events/s with low jitter
- mono WAV chunks held in the expected `258-281 KiB` range
- chunk-ready overhead kept below `50-150 ms` after each `3s` boundary

### Why This Script Matters

This is the script that justifies phrases like:

- audio normalization
- browser-side WAV serialization
- stable chunked transcription input
- reliable real-time microphone capture

## Script 2: Web Worker vs Main-Thread Export

### Suggested Name

`scripts/perf/measure-worker-blocking.js`

### Purpose

Measure how much the inline worker reduces UI blocking while merging PCM buffers and encoding WAV.

### What The Script Should Test

- current inline-worker export path
- forced main-thread export path using the exact same merge and WAV encode logic
- export on `3s`, `10s`, `30s`, and `60s` synthetic audio windows
- export while the page is also receiving clicks, typing, and animation work
- at least `30-50` runs per duration

### Metrics To Capture

- `p50`, `p95`, and max export completion time
- long-task count above `50 ms`
- total blocking time
- dropped-frame count
- `p75` INP while export is happening
- main-thread busy time during export

### Benchmarks To Judge Against

- ideal long-task count during export: as close to `0` as possible
- main-thread stalls should stay below `50 ms` at the high end
- strong result: frame work mostly stays inside the `10-16 ms` band
- strong result: INP stays `<= 200 ms` during export

### Interview-Friendly Number Bands If Results Go Well

- `70-90%` lower main-thread blocking during export
- `80-95%` fewer long tasks during WAV generation
- `p95` stall time reduced from triple-digit milliseconds to sub-`50 ms`
- sustained visual smoothness near `60 FPS` during normal chunk export

### Important Honesty Note

If total encode time does not improve much, that is fine.

The right claim is:

"kept the UI responsive during WAV export by offloading merge and encode work"

not:

"made encoding X times faster"

unless the measurements actually prove it.

## Script 3: Transcript Update Batching Impact

### Suggested Name

`scripts/perf/measure-transcript-batching.js`

### Purpose

Quantify whether the `500 ms` buffered transcript hook actually reduces React work in a meaningful way.

### What The Script Should Test

- naive `setState` on every update
- current `bufferRef + 500 ms flush` implementation
- simulated transcript update cadences of:
  - `50 ms`
  - `100 ms`
  - `250 ms`
  - `500 ms`
  - `1000 ms`
  - `3000 ms`
- fixed transcript durations like `60s` and `180s`

### Metrics To Capture

- total React renders
- renders per second
- `p50` and `p95` commit time
- render-thread time
- long tasks during streaming
- INP while updates are streaming
- heap churn from repeated transcript growth

### Expected Reduction Math

- `50 ms` cadence: `20` updates/s down to about `2` visible flushes/s, roughly `90%` fewer renders
- `100 ms` cadence: `10` updates/s down to about `2` flushes/s, roughly `80%` fewer renders
- `250 ms` cadence: `4` updates/s down to about `2` flushes/s, roughly `50%` fewer renders
- `500 ms` cadence: almost no reduction
- `1000 ms` cadence: almost no reduction
- `3000 ms` cadence: effectively no reduction

### Interview-Friendly Number Bands If Results Go Well

- `50-90%` fewer transcript-driven re-renders under bursty update streams
- `30-70%` lower render-thread time during dense transcript updates
- INP held under `200 ms` while partial updates are streaming

### Important Honesty Note

This is the weakest candidate of the three if we measure the app exactly as it works today.

Why:

- transcript chunks appear to arrive every `3s`
- the hook waits `500 ms`
- that means the production path may show little real performance improvement

If the script proves the gain is small on real traffic, this bullet should be softened or dropped instead of forced.

## Script 4: End-to-End Speech-To-Visible-Text Latency

### Suggested Name

`scripts/perf/measure-speech-to-visible-text.js`

### Purpose

Measure the user-visible delay from audio capture to transcript paint.

### What The Script Should Test

- timestamp chunk start
- timestamp chunk end
- timestamp WAV ready
- timestamp upload start
- timestamp response received
- timestamp transcript append
- timestamp transcript paint after the `500 ms` UI flush

### Metrics To Capture

- speech-start to transcript-visible latency
- chunk-end to transcript-visible latency
- browser encode overhead
- upload round-trip time
- backend transcription time
- UI flush overhead

### Realistic Expectation Band

There is a hard structural delay built into the current architecture:

- `3.0s` chunk window
- `500 ms` transcript flush delay

So the theoretical floor is already about `3.5s` before network and model time are counted.

### Interview-Friendly Number Bands If Results Go Well

- `p50` speech-to-visible latency under `4.0-4.5s`
- `p95` under `5.0-6.0s`
- browser-side encode plus UI overhead under `200 ms` beyond the chunking floor

### Why This Script Matters

This is the easiest metric for an interviewer to understand fast.

It also ties together:

- audio capture
- WAV preparation
- worker offload
- transcript batching

## Script 5: Long-Session Reliability

### Suggested Name

`scripts/perf/stress-live-recording-session.js`

### Purpose

Prove that the live recording loop survives longer sessions without drift, leak, or chunk corruption.

### What The Script Should Test

- `10 min`, `20 min`, and `30 min` sessions
- every chunk export
- every upload attempt
- every transcription response
- transcript append continuity
- CPU stress
- temporary network slowdown
- tab backgrounding if possible

### Metrics To Capture

- successful chunk export rate
- failed upload rate
- empty partial-text rate
- memory growth over time
- chunk timing drift
- session completion rate

### Interview-Friendly Number Bands If Results Go Well

- `99%+` successful chunk processing over long sessions
- chunk interval drift kept below `100-200 ms` over `20-30 min`
- memory growth bounded within a small fixed range over long runs

## Recommended Execution Order

Build these first:

1. `measure-worker-blocking.js`
2. `measure-speech-to-visible-text.js`
3. `profile-audio-pipeline.js`
4. `measure-transcript-batching.js`
5. `stress-live-recording-session.js`

Reason:

- Script 2 gives the strongest Web Worker number
- Script 4 gives the easiest product-latency number
- Script 1 gives the strongest technical depth number
- Script 3 tells us whether the debounce point deserves to stay
- Script 5 gives reliability numbers if we want one extra bullet or interview proof

## Likely Resume-Safe Bullet Shapes After Measurement

These are not final bullets. They are only templates for later rewriting.

- Reduced `p95` main-thread stalls from `X ms` to `Y ms`, as measured by long-task traces during WAV export, by offloading PCM merge and WAV encoding to an inline Web Worker.
- Kept `3s` mono audio chunk exports within `Y ms` of the recording boundary across `Z` test chunks, by tuning browser-side PCM buffering, channel handling, and WAV serialization.
- Held speech-to-visible transcript latency to `X s` at `p50` and `Y s` at `p95`, as measured in repeated live-session trials, by chunking microphone audio and optimizing the browser export pipeline.
- Cut transcript-driven re-renders by `X%`, as measured under `100-250 ms` partial-update streams, by buffering transcript chunks in refs and flushing UI state every `500 ms`.

## Final Recommendation

The interviewer-impressive numbers are most likely to come from:

1. lower main-thread blocking during WAV export
2. stable end-to-end speech-to-visible latency
3. reliable long-session chunk processing

The transcript batching point only stays if measurement proves it actually moves the needle under realistic update frequency.

## Sources

- web.dev, Optimize long tasks: https://web.dev/articles/optimize-long-tasks
- web.dev, Rendering performance: https://web.dev/articles/rendering-performance
- web.dev, Interaction to Next Paint (INP): https://web.dev/articles/inp
- MDN, Using Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
- MDN, BaseAudioContext.createScriptProcessor(): https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createScriptProcessor
- MDN, AudioContext.baseLatency: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency
