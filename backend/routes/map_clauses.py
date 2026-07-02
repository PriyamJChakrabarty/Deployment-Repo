# /backend/routes/map_clauses.py

from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

router = APIRouter()

POLICY_DB = [
    {"id": 1, "text": "Any new contract must be reviewed by Legal within 14 business days.", "tag": "Contract Review"},
    {"id": 2, "text": "All project budgets exceeding $50,000 require CFO approval and two sign-offs.", "tag": "Financial Threshold"},
    {"id": 3, "text": "Data subject access requests must be processed within 30 days under GDPR compliance. Failure results in a fine.", "tag": "GDPR Compliance"},
    {"id": 4, "text": "The penalty for missing the Q3 delivery milestone is a 10% reduction in final payment.", "tag": "Penalty Clause"},
    {"id": 5, "text": "All external communications must use the approved brand template.", "tag": "Brand Compliance"},
]

MODEL_NAME = 'all-MiniLM-L6-v2'
model = SentenceTransformer(MODEL_NAME)

def create_and_load_faiss_index(db):
    """Encodes policy text and creates a FAISS Index."""
    texts = [item["text"] for item in db]
    
    embeddings = model.encode(texts, convert_to_numpy=True).astype('float32')
    
    d = embeddings.shape[1] 
    
    index = faiss.IndexFlatL2(d)
    index.add(embeddings)
    
    print(f"FAISS Index created with {index.ntotal} vectors using {MODEL_NAME}.")
    return index

FAISS_INDEX = create_and_load_faiss_index(POLICY_DB)

class ClauseMapRequest(BaseModel):
    description: str

class ClauseMapResponse(BaseModel):
    related_clauses: list
    raw_query: str


@router.post("/map_clauses", response_model=ClauseMapResponse)
async def map_clauses_endpoint(request: ClauseMapRequest):
    """
    Retrieves the top 3 most similar policy clauses to the input description.
    """
    query_text = request.description
    k = 3 
    
    query_vector = model.encode([query_text], convert_to_numpy=True).astype('float32')
    
    distances, indices = FAISS_INDEX.search(query_vector, k)
    
    related_clauses = []
    for i in indices[0]:
        if i >= 0 and i < len(POLICY_DB):
            clause = POLICY_DB[i]
            related_clauses.append({
                "source_tag": clause["tag"],
                "policy_text": clause["text"],
                "policy_id": clause["id"],
            })

    return {
        "related_clauses": related_clauses,
        "raw_query": query_text
    }