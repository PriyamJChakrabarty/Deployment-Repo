from fastapi import APIRouter
from pydantic import BaseModel
from utils.gemini_client import generate_from_groq
from utils.response_parser import safe_json_parse

router = APIRouter()

class ActionsRequest(BaseModel):
    transcript: str

@router.post("/actions")
async def get_actions(req: ActionsRequest):
    prompt = (
        "You are a legal operations assistant. "
        "From the following meeting transcript, extract a JSON array of clear action items "
        "with fields: action, responsible, deadline. Respond ONLY in JSON format.\n\n"
        f"Transcript:\n{req.transcript}"
    )

    response_text = generate_from_groq(prompt)
    actions = safe_json_parse(response_text)

    return {
        "actions": actions,
        "raw": response_text
    }
