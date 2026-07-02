##query_docs.py
import os
import json
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Literal
from datetime import date # For date fields in the response model

# --- Groq Client Setup ---
from groq import Groq
from utils.paths import backend_path, data_path

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
# ---
# 1. DEFINE DATA MODELS
# ---

# Model for the API request body
class QueryRequest(BaseModel):
    query: str = Field(description="The user's question about the documents.")

# Model for the API response body
class QueryResponse(BaseModel):
    answer: str = Field(description="The AI's answer, based only on the database.")

# ---
# 2. DEFINE YOUR API ROUTER AND ENDPOINT
# ---

router = APIRouter()
DB_PATH = data_path("db.json")
EMP_PATH = backend_path("employee.json")

@router.post("/query-docs", response_model=QueryResponse)
async def answer_document_query(
    request: QueryRequest
):
    """
    Answers a user's natural language query based on the
    contents of the db.json file.
    """
    
    # --- 1. Load the entire database ---
    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="db.json not found.")
    
    try:
        with DB_PATH.open("r") as f:
            db_content = json.load(f)
        db_json_string = json.dumps(db_content, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read or parse db.json: {e}")

    if not EMP_PATH.exists():
        raise HTTPException(status_code=404, detail="emp.json not found.")
    
    try:
        with EMP_PATH.open("r") as f:
            emp_content = json.load(f)
        emp_json_string = json.dumps(emp_content, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read or parse db.json: {e}")


    # --- 2. Build the LLM Prompt ---
    # This is a classic "RAG" (Retrieval-Augmented Generation) prompt.
    prompt = f"""
    You are a helpful legal assistant. Your job is to answer the user's question based *only* on the document and employee database provided.

    **Rules:**
    1.  Read the user's question.
    2.  Find the answer within the 'DOCUMENT DATABASE' and 'EMPLOYEE DATABASE' context.
    3.  Answer the question in a very brief, clear, natural language.
    4.  **Do not** make up information. If the answer is not in the database, say "I cannot find that information in the provided documents."
    5.  You do not need to return JSON. Just provide a helpful text answer.

    ---
    **DOCUMENT DATABASE (db.json):**
    {db_json_string}
     **EMPLOYEE DATABASE (emp.json):**
    {emp_json_string}
    ---

    **USER'S QUESTION:**
    "{request.query}"
    ---

    **YOUR ANSWER:**
    """

    # --- 3. Call Groq ---
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )

        answer_text = response.choices[0].message.content

    except Exception as e:
        print(f"Groq API call failed: {e}")
        raise HTTPException(status_code=500, detail=f"Groq error: {e}")

    # --- 4. Return the Answer ---
    return QueryResponse(answer=answer_text)
