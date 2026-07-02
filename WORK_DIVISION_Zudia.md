# Zudia — Work Division & Push Order

## Team Responsibilities

| Member | Domain |
|--------|--------|
| **Priyam** | Speech-to-Text · System Scaling · Database · Error Handling · Action Extraction (ML) |
| **Tejesh** | ML Backend (AI routes, Gemini, embeddings, chatbot) · DB Testing |
| **Hridayesh** | Frontend (layout, pages, meeting UI) |
| **Tejesh + Priyam** | Shared frontend slice (ML-adjacent UI + DB/system UI) |

---

## Initial Repo Setup (Priyam — run once before adding collaborators)

```bash
# 1. Create Next.js app
npx create-next-app@latest zudia
# Prompts:
#   TypeScript?         → No
#   ESLint?             → Yes
#   Tailwind CSS?       → Yes
#   src/ directory?     → No
#   App Router?         → Yes
#   Import alias (@/*)?  → Yes (default)

cd zudia

# 2. Install frontend dependencies
npm install @clerk/nextjs lucide-react axios resend

# 3. Create backend scaffold
mkdir backend
mkdir backend\routes
mkdir backend\utils
mkdir backend\api
mkdir backend\uploads

# 4. Create Python requirements file
echo. > backend\requirements.txt

# 5. Init git & push skeleton
git init
git add .gitignore next.config.mjs package.json tailwind.config.js postcss.config.js jsconfig.json eslint.config.mjs
git commit -m "chore: initial project scaffold"
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

After the initial push, add **Tejesh** and **Hridayesh** as collaborators on GitHub.

---

## Push Order & File Ownership

Each push is one logical unit. Complete them **in phase order** — later phases depend on earlier ones being merged.

---

### Phase 1 — Backend Foundation `(Priyam)`
> FastAPI entry point, DB client, data files, Python deps

| # | File | Description |
|---|------|-------------|
| 1 | `backend/requirements.txt` | All Python dependencies |
| 2 | `backend/main.py` | FastAPI app, CORS, route registration |
| 3 | `backend/utils/db_client.py` | MongoDB / JSON DB connection helper |
| 4 | `backend/db.json` | Document database seed |
| 5 | `backend/employee.json` | Employee/user seed data |

**Push message:** `feat(backend): FastAPI entry point + database client`

---

### Phase 2 — ML Utilities `(Tejesh)`
> Gemini client, response parser, and DB smoke test — depends on Phase 1

| # | File | Description |
|---|------|-------------|
| 6 | `backend/utils/gemini_client.py` | Google Gemini API wrapper |
| 7 | `backend/utils/response_parser.py` | Parse / normalise AI responses |
| 8 | `backend/db_test.py` | DB smoke-test script |

**Push message:** `feat(ml): Gemini client, response parser utilities + DB smoke test`

---

### Phase 3 — ML Backend Routes `(Tejesh)`
> Core AI processing routes — depends on Phase 1 + 2

| # | File | Description |
|---|------|-------------|
| 9 | `backend/routes/extract.py` | Extract structured data from transcripts |
| 10 | `backend/routes/map_clauses.py` | Map meeting points to document clauses |
| 11 | `backend/routes/ocr_upload.py` | OCR file upload + processing |
| 12 | `backend/routes/query_docs.py` | Vector search / document query |
| 13 | `backend/routes/suggest_and_implement_changes.py` | AI-suggested document edits |
| 14 | `backend/api/chatbot.py` | Conversational chatbot endpoint |

**Push message:** `feat(ml): AI analysis routes — extract, clauses, OCR, query, suggestions, chatbot`

---

### Phase 4 — Speech-to-Text + Action Extraction `(Priyam)`
> Whisper transcription + action item ML route — depends on Phase 1 + 2

| # | File | Description |
|---|------|-------------|
| 15 | `backend/routes/transcribe.py` | Whisper audio transcription endpoint |
| 16 | `backend/routes/actions.py` | Extract action items from transcript (Gemini) |

**Push message:** `feat(stt+ml): Whisper transcription route + action item extraction`

---

### Phase 5 — Frontend Foundation `(Hridayesh)`
> Global styles, root layout, auth pages, landing page shell

| # | File | Description |
|---|------|-------------|
| 17 | `app/globals.css` | Global Tailwind + custom CSS |
| 18 | `app/layout.js` | Root layout with Clerk provider |
| 19 | `app/components/layout/Navbar.js` | Top navigation bar |
| 20 | `app/components/layout/Footer.js` | Footer |
| 21 | `app/components/layout/HeroSection.js` | Landing hero banner |
| 22 | `app/components/layout/FeaturesSection.js` | Features showcase section |
| 23 | `app/components/layout/AudioUploadSection.js` | Audio upload landing section |
| 24 | `app/components/features/AudioUploadCard.js` | Audio upload card component |
| 25 | `app/page.js` | Home / landing page |
| 26 | `app/sign-in/[[...sign-in]]/page.js` | Clerk sign-in page |
| 27 | `app/sign-up/[[...sign-up]]/page.js` | Clerk sign-up page |

**Push message:** `feat(frontend): layout, landing page, auth pages`

---

### Phase 6 — Frontend API Layer & Recording Hooks `(Priyam)`
> Axios instance + live transcription hook + recorder components

| # | File | Description |
|---|------|-------------|
| 28 | `app/lib/api.js` | Axios instance, base URL, interceptors |
| 29 | `app/hooks/useLiveTranscript.js` | Custom hook — live transcription state |
| 30 | `app/components/Recorder.js` | Core audio recorder component |
| 31 | `app/components/RecorderHelper.js` | Recorder utility functions |
| 32 | `app/components/VoiceRecorder.js` | Voice recorder UI wrapper |

**Push message:** `feat(frontend): API layer, live transcript hook, recorder components`

---

### Phase 7 — Meeting UI Core `(Hridayesh)`
> Meeting page display components — depends on Phase 5 + 6

| # | File | Description |
|---|------|-------------|
| 33 | `app/components/meeting/LiveRecordingCard.js` | Live recording status card |
| 34 | `app/components/meeting/TranscriptDisplay.js` | Real-time transcript display |
| 35 | `app/components/meeting/AnalysisControl.js` | Analysis trigger controls |
| 36 | `app/components/meeting/DataTable.js` | Tabular results display |

**Push message:** `feat(frontend): meeting UI — recording card, transcript, analysis controls, data table`

---

### Phase 8 — ML-Adjacent Frontend `(Tejesh)`
> Chatbot UI and document interaction components — depends on Phase 3 + 7

| # | File | Description |
|---|------|-------------|
| 37 | `app/components/meeting/ChatbotCard.js` | Chatbot message card UI |
| 38 | `app/components/meeting/ChatbotSection.js` | Chatbot panel / section wrapper |
| 39 | `app/components/meeting/DocumentQuery.js` | Document search / query interface |
| 40 | `app/components/meeting/SuggestChangesSection.js` | Suggest & apply changes UI |

**Push message:** `feat(frontend): ML UI — chatbot, document query, suggest changes`

---

### Phase 9 — DB Viewer & System Frontend `(Priyam)`
> Database viewer, email report API route, middleware — depends on Phase 1 + 6

| # | File | Description |
|---|------|-------------|
| 41 | `app/components/meeting/DBViewer.jsx` | Database document viewer component |
| 42 | `app/api/send-report/route.js` | Email report API route (Resend) |
| 43 | `middleware.js` | Next.js Clerk auth middleware |

**Push message:** `feat(frontend): DB viewer, email report route, auth middleware`

---

### Phase 10 — Meeting Page Assembly `(Hridayesh)`
> Final meeting page composition — depends on all earlier phases

| # | File | Description |
|---|------|-------------|
| 44 | `app/meeting/page.js` | Meeting page — assembles all components |

**Push message:** `feat(frontend): meeting page — full component assembly`

---

### Phase 11 — Error Handling & Polish `(Priyam)`
> Error boundaries, input validation, scaling config — final pass

| # | File | Description |
|---|------|-------------|
| 45 | `backend/main.py` *(update)* | Add global exception handlers, rate limiting |
| 46 | `backend/routes/transcribe.py` *(update)* | Chunk upload error handling, retries |
| 47 | `next.config.mjs` *(update)* | Production rewrites, image domains, headers |

**Push message:** `feat(system): error handling, input validation, scaling config`

---

## Summary Ownership Table

| File | Owner |
|------|-------|
| `backend/main.py` | Priyam |
| `backend/requirements.txt` | Priyam |
| `backend/db.json` | Priyam |
| `backend/employee.json` | Priyam |
| `backend/utils/db_client.py` | Priyam |
| `backend/routes/transcribe.py` | Priyam |
| `backend/routes/actions.py` | Priyam *(ML slice)* |
| `backend/utils/gemini_client.py` | Tejesh |
| `backend/utils/response_parser.py` | Tejesh |
| `backend/db_test.py` | Tejesh *(backend slice)* |
| `backend/routes/extract.py` | Tejesh |
| `backend/routes/map_clauses.py` | Tejesh |
| `backend/routes/ocr_upload.py` | Tejesh |
| `backend/routes/query_docs.py` | Tejesh |
| `backend/routes/suggest_and_implement_changes.py` | Tejesh |
| `backend/api/chatbot.py` | Tejesh |
| `app/globals.css` | Hridayesh |
| `app/layout.js` | Hridayesh |
| `app/page.js` | Hridayesh |
| `app/sign-in/[[...sign-in]]/page.js` | Hridayesh |
| `app/sign-up/[[...sign-up]]/page.js` | Hridayesh |
| `app/components/layout/Navbar.js` | Hridayesh |
| `app/components/layout/Footer.js` | Hridayesh |
| `app/components/layout/HeroSection.js` | Hridayesh |
| `app/components/layout/FeaturesSection.js` | Hridayesh |
| `app/components/layout/AudioUploadSection.js` | Hridayesh |
| `app/components/features/AudioUploadCard.js` | Hridayesh |
| `app/components/meeting/LiveRecordingCard.js` | Hridayesh |
| `app/components/meeting/TranscriptDisplay.js` | Hridayesh |
| `app/components/meeting/AnalysisControl.js` | Hridayesh |
| `app/components/meeting/DataTable.js` | Hridayesh |
| `app/meeting/page.js` | Hridayesh |
| `app/components/meeting/ChatbotCard.js` | Tejesh |
| `app/components/meeting/ChatbotSection.js` | Tejesh |
| `app/components/meeting/DocumentQuery.js` | Tejesh |
| `app/components/meeting/SuggestChangesSection.js` | Tejesh |
| `app/lib/api.js` | Priyam |
| `app/hooks/useLiveTranscript.js` | Priyam |
| `app/components/Recorder.js` | Priyam |
| `app/components/RecorderHelper.js` | Priyam |
| `app/components/VoiceRecorder.js` | Priyam |
| `app/components/meeting/DBViewer.jsx` | Priyam |
| `app/api/send-report/route.js` | Priyam |
| `middleware.js` | Priyam |
| `next.config.mjs` | Priyam |
| `tailwind.config.js` | Priyam (scaffold) |
| `package.json` | Priyam (scaffold) |
| `jsconfig.json` | Priyam (scaffold) |
| `eslint.config.mjs` | Priyam (scaffold) |
| `postcss.config.js` | Priyam (scaffold) |
| `.gitignore` | Priyam (scaffold) |

---

## Dependency Graph (phases must complete in order)

```
Phase 1 (Priyam: DB + main.py)
    └── Phase 2 (Tejesh: ML utils)
            └── Phase 3 (Tejesh: ML routes)
    └── Phase 4 (Priyam: STT route)
Phase 5 (Hridayesh: Frontend foundation)
    └── Phase 6 (Priyam: API layer + recorders)
            └── Phase 7 (Hridayesh: Meeting UI core)
                    └── Phase 8 (Tejesh: ML frontend)
                    └── Phase 9 (Priyam: DB viewer + system)
                            └── Phase 10 (Hridayesh: Meeting page assembly)
                                        └── Phase 11 (Priyam: Error handling + polish)
```

Phases 1–4 (backend) and Phases 5–6 (frontend foundation) can be developed in parallel by different members.
