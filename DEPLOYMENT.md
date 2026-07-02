# Deployment Guide

This repo is split into:

- `backend/`: FastAPI + Whisper + FFmpeg + Groq + local JSON/FAISS files
- repo root: Next.js frontend that should be deployed on Vercel

The correct deployment order is:

1. Deploy the backend first.
2. Copy the backend public URL.
3. Deploy the frontend to Vercel using that backend URL.

## Important Repo-Specific Notes

Before you deploy, understand these project constraints:

- The backend is not a good fit for Vercel as-is.
  It uses FastAPI, Whisper, Torch, FFmpeg, and local writable files.
- The frontend now reads the backend URL from `NEXT_PUBLIC_BACKEND_URL`.
- The backend now has a `backend/Dockerfile`, which is the easiest way to deploy it on most hosts.
- The backend writes uploaded/processed data to local files:
  - `db.json`
  - `faiss.bin`
  - `map.json`
- Those files should live on a mounted volume in production.
- If you do not attach persistent storage, uploaded documents and approved changes can disappear on redeploy/restart.
- Clerk keys are required for a real frontend build on Vercel.
- Resend requires `RESEND_API_KEY`, and in production you should use a verified sender domain instead of the default test sender.

## Recommended Backend Hosts

These are the best candidates for this backend because they support Docker and can work with persistent storage:

1. Render
   Best overall if you want the easiest UI-based deploy plus a persistent disk.
2. Railway
   Good if you want a fast GitHub-to-URL workflow and are comfortable configuring volumes.
3. Fly.io
   Best if you want more control over infra and regions.

My recommendation for this repo: start with Render.

## Required Backend Environment Variables

Set these on whichever backend host you choose:

- `GROQ_API_KEY`
- `BACKEND_DATA_DIR=/data`

Optional:

- `MONGO_URI`
  The current code no longer requires a default Mongo URI, so only set this if you actually want Mongo-backed behavior later.

## Backend Deployment Option A: Render (Recommended)

### 1. Push the repo to GitHub

Make sure your latest code is pushed, including:

- `backend/Dockerfile`
- `app/lib/backend-url.js`
- `backend/utils/paths.py`

### 2. Create a new Render Web Service

In Render:

1. Click `New +`.
2. Click `Web Service`.
3. Connect your GitHub repo.
4. Select this repo.

### 3. Point Render at the backend

Set:

- `Root Directory`: `backend`
- `Environment`: `Docker`

Render should detect `backend/Dockerfile`.

### 4. Add a persistent disk

This matters for `db.json`, `faiss.bin`, and `map.json`.

In the Render service:

1. Open `Disks`.
2. Add a disk.
3. Mount path: `/data`

### 5. Add environment variables

In `Environment` set:

- `GROQ_API_KEY=...`
- `BACKEND_DATA_DIR=/data`
- `MONGO_URI=...` if you want Mongo

### 6. Deploy

Click deploy and wait for the service to build.

Your backend URL will look like:

```text
https://your-backend-name.onrender.com
```

### 7. Verify the backend

Open these in the browser:

- `https://your-backend-name.onrender.com/`
- `https://your-backend-name.onrender.com/openapi.json`

Expected health response:

```json
{"status":"OK"}
```

You can also run:

```powershell
python backend_smoke_test.py https://your-backend-name.onrender.com
```

## Backend Deployment Option B: Railway

Use Railway if you want a quick Docker deploy and you are okay configuring a volume.

### 1. Create a new project

In Railway:

1. Create `New Project`.
2. Choose `Deploy from GitHub repo`.
3. Select this repo.

### 2. Point the service at the backend

Set the service root directory to:

```text
backend
```

Railway should use the `backend/Dockerfile`.

### 3. Add a volume

Create a volume and mount it at:

```text
/data
```

### 4. Add environment variables

Set:

- `GROQ_API_KEY=...`
- `BACKEND_DATA_DIR=/data`
- `MONGO_URI=...` if needed

### 5. Deploy and verify

After deployment, verify:

- `https://your-railway-url/`
- `https://your-railway-url/openapi.json`

## Backend Deployment Option C: Fly.io

Use Fly.io if you want more infra control.

### 1. Install Fly CLI and log in

```powershell
fly auth login
```

### 2. Launch from the backend directory

```powershell
cd backend
fly launch
```

Choose:

- an app name
- a region near your users
- Dockerfile deployment

### 3. Create a volume

Create a volume in the same region:

```powershell
fly volumes create zudia_data --size 1
```

### 4. Mount the volume

Make sure your `fly.toml` mounts the volume at:

```toml
[[mounts]]
  source = "zudia_data"
  destination = "/data"
```

### 5. Set secrets

```powershell
fly secrets set GROQ_API_KEY=your_key BACKEND_DATA_DIR=/data
```

Optional:

```powershell
fly secrets set MONGO_URI=your_mongo_uri
```

### 6. Deploy

```powershell
fly deploy
```

### 7. Verify

Check:

- `https://your-fly-app.fly.dev/`
- `https://your-fly-app.fly.dev/openapi.json`

## Local Backend Test With Docker

If you want to test the backend container before deploying:

```powershell
cd backend
docker build -t zudia-backend .
docker run --rm -p 8000:8000 -e GROQ_API_KEY=your_key -e BACKEND_DATA_DIR=/data -v zudia_backend_data:/data zudia-backend
```

Then visit:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/openapi.json`

## Frontend Deployment on Vercel

Once the backend is live, deploy the Next.js frontend.

### 1. Create the Vercel project

In Vercel:

1. Click `Add New...`
2. Click `Project`
3. Import the GitHub repo
4. Keep the project root at the repo root

Do not set the root directory to `backend`.

### 2. Add frontend environment variables

In Vercel project settings, add:

- `NEXT_PUBLIC_BACKEND_URL=https://your-backend-url`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...`
- `CLERK_SECRET_KEY=...`
- `RESEND_API_KEY=...`

Use your real backend URL from Render, Railway, or Fly.io.

Example:

```text
NEXT_PUBLIC_BACKEND_URL=https://your-backend-name.onrender.com
```

### 3. Clerk dashboard updates

In Clerk:

1. Add your Vercel production domain.
2. Add your Vercel preview domain if you want preview auth to work.
3. Make sure allowed redirect URLs include:
   - `https://your-site.vercel.app/sign-in`
   - `https://your-site.vercel.app/sign-up`

### 4. Resend sender setup

The code currently sends from:

```text
onboarding@resend.dev
```

That is fine for basic testing.

For production:

1. Verify your domain in Resend.
2. Replace the sender in `app/api/send-report/route.js` with your verified sender address.

### 5. Deploy

Click deploy in Vercel.

## Post-Deploy Verification

After both deployments are live, test this order:

### Backend checks

1. Open `/`
2. Open `/openapi.json`
3. Test `/api/chatbot`
4. Test `/transcribe` with an audio file
5. Test `/api/ocr_upload` with a PDF

### Frontend checks

1. Open the homepage on Vercel
2. Confirm sign-in/sign-up works
3. Open `/meeting`
4. Start live transcription
5. Confirm transcript analysis works
6. Confirm chatbot works
7. Confirm database viewer works
8. Confirm suggest/apply changes works
9. Confirm report email sending works

## Common Failure Cases

### 1. Frontend cannot reach backend

Cause:

- `NEXT_PUBLIC_BACKEND_URL` is missing or wrong

Fix:

- Set the correct full backend URL in Vercel
- redeploy the frontend

### 2. Backend loses documents after redeploy

Cause:

- no persistent disk/volume

Fix:

- attach storage
- keep `BACKEND_DATA_DIR=/data`

### 3. Transcription fails

Cause:

- FFmpeg missing
- host not using the provided Dockerfile

Fix:

- deploy with `backend/Dockerfile`

### 4. Vercel build fails with Clerk errors

Cause:

- missing or invalid Clerk env vars

Fix:

- set real `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- set real `CLERK_SECRET_KEY`
- redeploy

### 5. Email report fails

Cause:

- missing `RESEND_API_KEY`
- unverified sender domain in production

Fix:

- set `RESEND_API_KEY`
- use a verified sender

## Best Production Upgrade After Initial Deploy

This app will work fastest if you deploy it exactly as documented above.

But the next production upgrade should be:

1. Move document storage out of `db.json` into MongoDB or another database.
2. Move uploaded/document index artifacts off the app filesystem if you want easier scaling.
3. Tighten CORS from `*` to only your Vercel domain.

## Official Docs

- Vercel environment variables:
  `https://vercel.com/docs/projects/environment-variables`
- Render Docker services:
  `https://render.com/docs/docker`
- Render persistent disks:
  `https://render.com/docs/disks`
- Railway Dockerfiles:
  `https://docs.railway.com/deploy/dockerfiles`
- Railway volumes:
  `https://docs.railway.com/reference/volumes`
- Fly deploy:
  `https://fly.io/docs/launch/deploy/`
- Fly volumes:
  `https://fly.io/docs/volumes/overview/`
