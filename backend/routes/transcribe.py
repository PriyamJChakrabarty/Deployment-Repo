from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import whisper
import os
import tempfile
import shutil

router = APIRouter()

# ✅ Load model once (can be tiny/base/small)
model = whisper.load_model("small")

@router.post("/transcribe/chunk")
async def transcribe_chunk(file: UploadFile = File(...)):
    try:
        # ✅ Create a temp directory for chunks
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = os.path.join(tmpdir, file.filename)
            
            # ✅ Write the uploaded chunk
            with open(file_path, "wb") as f:
                f.write(await file.read())

            # ✅ Run Whisper (OpenAI-whisper requires ffmpeg)
            result = model.transcribe(file_path, fp16=False, language="en")
            text = result.get("text", "").strip()

            # ✅ Basic English-only cleanup (filters gibberish)
            if not text or len(text.strip()) < 2 or not any(c.isalpha() for c in text):
                text = ""

        return {"partial_text": text}

    except FileNotFoundError as e:
        print("🚫 FFmpeg not found! Install via: choco install ffmpeg -y")
        raise HTTPException(status_code=500, detail="FFmpeg missing or not in PATH")
    except Exception as e:
        print("Error in /transcribe/chunk:", e)
        return JSONResponse(content={"error": str(e)}, status_code=400)