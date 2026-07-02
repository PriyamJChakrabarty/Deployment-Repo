Below is the ranked list Iâ€™d prepare for interviews. The score is a blended /10 for interview frequency + industry relevance + uniqueness + how strongly it maps to your code.
9.8/10 Real-time speech pipeline design [Both]: mic input â†’ browser chunking â†’ WAV encode â†’ FastAPI upload â†’ Whisper transcription â†’ incremental UI updates. This is your strongest â€œtell me something complex you builtâ€ story.
9.6/10 Web Workers for heavy client-side processing [JS-heavy]: you used an inline worker to merge buffers / encode WAV off the main thread instead of freezing the UI.
9.5/10 Web Audio API internals [JS-heavy]: AudioContext, MediaStreamSource, PCM buffers, channel handling, WAV encoding, and why audio processing in-browser is tricky.
9.4/10 getUserMedia() permission + security model [JS-heavy]: secure-context requirement, permission prompts, rejection cases, and what happens when the user ignores the prompt.
9.3/10 Audio latency vs accuracy tradeoff [Both]: 3-second chunks, bufferLen: 4096, downsampling, and the balance between responsiveness, quality, and CPU cost.
9.2/10 ScriptProcessorNode vs AudioWorklet [JS-heavy]: very eye-catching because your code uses createScriptProcessor(), which MDN marks deprecated; knowing the migration path impresses interviewers.
9.1/10 Multipart upload mechanics [Both]: Blob/FormData in the browser and FastAPI UploadFile on the server for chunked audio transfer.
9.0/10 FastAPI async file ingestion [Py-heavy]: UploadFile, temporary directories, per-request cleanup, and why you load the Whisper model once instead of per request.
8.9/10 Whisper runtime dependencies [Py-heavy]: model sizing, cold-start behavior, ffmpeg dependency, and why STT pipelines fail in real deployments.
8.8/10 useRef vs useState [JS-heavy]: you used refs for mutable transcript buffers and timers so updates donâ€™t trigger re-renders, then flushed into state for UI.
8.7/10 Debouncing/throttling UI updates [JS-heavy]: your custom transcript hook delays visible updates by 500ms so the UI doesnâ€™t re-render on every small chunk.
8.7/10 Custom hooks in React [JS-heavy]: useLiveTranscript is a clean example of extracting reusable streaming-state logic into a hook.
8.6/10 useEffect dependency arrays and cleanup [JS-heavy]: your DB viewer refresh flow is a good place to discuss effect correctness, stale values, and cleanup discipline.
8.6/10 Promise.all concurrency [JS-heavy]: you fan out transcript analysis to multiple endpoints in parallel, which is a very common full-stack interview topic.
8.5/10 Fail-fast vs partial success in concurrent APIs [JS-heavy]: because Promise.all rejects on the first failure, you can discuss when Promise.allSettled is better for analysis pipelines.
8.5/10 API contract consistency [Both]: your frontend calls /api/map_clauses while the backend mount is commented out; talking about versioning / feature flags / schema contracts is very industry-relevant.
8.4/10 CORS and preflight requests [Both]: cross-port localhost counts as different origins, so frontend-backend splits naturally lead to CORS questions.
8.4/10 CORS credentials nuance [Py-heavy]: your FastAPI app currently uses allow_origins=["*"] with allow_credentials=True; knowing that this combination is not valid per FastAPI docs is an interviewer-catching detail.
8.3/10 Next.js Route Handlers / BFF pattern [JS-heavy]: app/api/send-report/route.js is a clean example of keeping third-party keys and email logic server-side.
8.3/10 Server-side HTML email generation [JS-heavy]: you transform meeting outputs into a structured compliance report and send it through Resend, which shows practical product thinking.
8.2/10 Auth middleware and route matching [JS-heavy]: clerkMiddleware + createRouteMatcher + protected/public route strategy is a very common web/SDE topic now.
8.1/10 Middleware matcher pitfalls [JS-heavy]: excluding static assets and letting API routes through without breaking CSS/images is exactly the kind of detail interviewers like.
8.1/10 MongoDB client lifecycle [Py-heavy]: initializing one MongoClient and reusing it across requests is more production-aware than reconnecting on every request.
8.0/10 Document-oriented schema design [Py-heavy]: your legal docs + nested clauses[] structure is a strong example of why MongoDB fits hierarchical content.
7.9/10 Secrets and env management [Both]: MONGO_URI / RESEND_API_KEY are good talking points for config strategy, secret rotation, and why hardcoded fallbacks should be removed.
7.8/10 Error handling and graceful degradation [Both]: empty partial transcriptions, chunk upload failures, HTTP 400/500s, and keeping the UI usable under partial failure.
The 5 that will usually impress the most in an interview are: real-time speech pipeline, Web Workers, Web Audio API, CORS nuance, and useRef/buffered transcript updates. Those are much stronger than saying â€œI used React/FastAPI/MongoDB.â€
Sources I used:
GeeksforGeeks JavaScript interview questions: https://www.geeksforgeeks.org/javascript/javascript-interview-questions/
GeeksforGeeks React interview questions: https://www.geeksforgeeks.org/reactjs/react-interview-questions/
GeeksforGeeks MongoDB interview questions: https://www.geeksforgeeks.org/mongodb/mongodb-interview-questions/
MDN getUserMedia(): https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
MDN Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
MDN FormData: https://developer.mozilla.org/en-US/docs/Web/API/FormData
MDN createScriptProcessor(): https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createScriptProcessor
MDN Promise.all(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
FastAPI file uploads: https://fastapi.tiangolo.com/tutorial/request-files/
FastAPI CORS: https://fastapi.tiangolo.com/tutorial/cors/
Next.js route.js: https://nextjs.org/docs/app/api-reference/file-conventions/route
Next.js middleware/proxy matcher docs: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
Clerk middleware docs: https://clerk.com/docs/reference/nextjs/clerk-middleware
Resend with Next.js: https://resend.com/docs/send-with-nextjs
OpenAI Whisper repo: https://github.com/openai/whisper
If you want, I can turn this into a second list of top 20 exact interview questions and polished answer angles based on your project, so you can rehearse directly.



Selected:

1. Solved tricky in-browser audio capture issues like inconsistent sample rates, raw PCM buffering, channel handling, and UI blocking by building a Web Audio plus Web Worker pipeline that converted live mic input into transcription ready normalized mono 16-bit WAV chunks.

2. Web Workers for heavy client-side processing you used an inline worker to merge buffers / encode WAV off the main thread instead of freezing the UI.

3. Debouncing/throttling UI updates: your custom transcript hook delays visible updates by 500ms so the UI doesnâ€™t re-render on every small chunk.