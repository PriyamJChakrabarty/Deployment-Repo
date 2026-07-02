from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import tempfile

import whisper

router = APIRouter()

model = whisper.load_model("small")


async def transcribe_uploaded_file(file: UploadFile) -> str:
    with tempfile.TemporaryDirectory() as tmpdir:
        filename = file.filename or "audio.wav"
        file_path = os.path.join(tmpdir, filename)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        result = model.transcribe(file_path, fp16=False, language="en")
        text = result.get("text", "").strip()

        if not text or len(text) < 2 or not any(char.isalpha() for char in text):
            return ""

        return text


@router.post("/transcribe")
async def transcribe_file(file: UploadFile = File(...)):
    try:
        text = await transcribe_uploaded_file(file)
        return {"transcript": text}
    except FileNotFoundError:
        print("FFmpeg not found! Install it and ensure it is on PATH.")
        raise HTTPException(status_code=500, detail="FFmpeg missing or not in PATH")
    except Exception as e:
        print("Error in /transcribe:", e)
        return JSONResponse(content={"error": str(e)}, status_code=400)


@router.post("/transcribe/chunk")
async def transcribe_chunk(file: UploadFile = File(...)):
    try:
        text = await transcribe_uploaded_file(file)
        return {"partial_text": text}
    except FileNotFoundError:
        print("FFmpeg not found! Install it and ensure it is on PATH.")
        raise HTTPException(status_code=500, detail="FFmpeg missing or not in PATH")
    except Exception as e:
        print("Error in /transcribe/chunk:", e)
        return JSONResponse(content={"error": str(e)}, status_code=400)
