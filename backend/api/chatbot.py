from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.gemini_client import generate_from_groq

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    is_legal_related: bool

@router.post("/api/chatbot", response_model=ChatResponse)
async def chatbot_endpoint(request: ChatRequest):
    """
    Chatbot endpoint that checks if query is legal/compliance related
    and provides appropriate responses.
    """
    try:
        user_message = request.message.strip()
        
        if not user_message:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # First, check if the query is legal/compliance/environment related
        classification_prompt = f"""
You are a legal and compliance AI assistant. Analyze the following user query and determine if it's related to:
- Legal matters
- Compliance regulations
- Environmental regulations
- Contractual terms
- Corporate governance
- Risk management
- Regulatory requirements
- Any professional/business legal context

User query: "{user_message}"

Respond with ONLY "YES" if it's related to any of the above topics, or "NO" if it's not.
"""
        
        classification = generate_from_groq(classification_prompt).strip().upper()
        
        if "YES" in classification:
            # Generate detailed legal/compliance response
            response_prompt = f"""
You are a knowledgeable legal and compliance assistant. A user has asked the following question:

"{user_message}"

Provide a helpful, professional, and accurate response. Follow these guidelines:
1. Keep your response SHORT and CONCISE (2-3 sentences or 1 short paragraph)
2. Give a direct answer to their question
3. Only provide detailed explanations if the user explicitly asks for more details (e.g., "explain more", "tell me more", "describe in detail", "elaborate")
4. If the question is simple, give a simple answer
5. Avoid lengthy explanations unless specifically requested

Be brief and to the point.
"""
            
            groq_response = generate_from_groq(response_prompt)
            
            return ChatResponse(
                response=groq_response,
                is_legal_related=True
            )
        else:
            # Not a legal/compliance query
            return ChatResponse(
                response="I apologize, but I'm specifically designed to assist with legal, compliance, and regulatory matters. Your question doesn't appear to be related to these areas. Please ask questions about legal terms, compliance requirements, environmental regulations, or similar topics, and I'll be happy to help!",
                is_legal_related=False
            )
            
    except Exception as e:
        print(f"Chatbot error: {e}")
        raise HTTPException(status_code=500, detail=f"Chatbot processing failed: {str(e)}")