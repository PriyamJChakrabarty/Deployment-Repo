from fastapi import APIRouter
from pydantic import BaseModel
from utils.gemini_client import generate_from_groq
from utils.response_parser import safe_json_parse

router = APIRouter()

class ExtractRequest(BaseModel):
    transcript: str

@router.post("/extract")
async def extract_data(req: ExtractRequest):
    prompt = (
        "You are a legal meeting analysis assistant. "
        "Given the transcript, extract a JSON array of key legal items "
        "with fields: Clause, Description, Risk Level, Responsible Person, Deadline. "
        "Respond ONLY in JSON format.\n\n"
        f"Transcript:\n{req.transcript}"
    )

    response_text = generate_from_groq(prompt)
    table = safe_json_parse(response_text)

    return {
        "table": table,
        "raw": response_text
    }
