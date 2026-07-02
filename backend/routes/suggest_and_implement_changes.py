##suggest_and_implement_changes.py

import os
import json
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Literal

from groq import Groq
from utils.paths import data_path

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ---
# 1. DEFINE YOUR DATA MODELS (The "First Thing")
# ---

# Model for the API request body
class TranscriptRequest(BaseModel):
    transcript: str = Field(description="The full text of the meeting transcript.")

class ClauseContent(BaseModel):
    """
    A copy of the ClauseContent model for structured output.
    """
    clause_id: str
    title: str
    text: str

class SuggestedChange(BaseModel):
    """
    A single suggested change to a document, derived from a transcript.
    """
    doc_id: str = Field(
        description="The doc_id from db.json that this change applies to."
    )
    
    operation_type: Literal[
        "MODIFY_METADATA", 
        "MODIFY_CLAUSE", 
        "ADD_CLAUSE", 
        "DELETE_CLAUSE"
    ] = Field(description="The type of change being suggested.")
    
    reasoning: str = Field(
        description="The exact snippet or summary from the transcript that justifies this change."
    )
    
    # Used for MODIFY_METADATA
    target_field: Optional[str] = Field(
        default=None, 
        description="For MODIFY_METADATA, the top-level key to change (e.g., 'termination_notice')."
    )
    
    # Used for MODIFY_CLAUSE or DELETE_CLAUSE
    target_clause_id: Optional[str] = Field(
        default=None, 
        description="For MODIFY_CLAUSE or DELETE_CLAUSE, the 'clause_id' of the clause to change/remove."
    )
    
    old_value: Optional[Any] = Field(
        default=None, 
        description="The current value in the database for comparison."
    )
    
    new_value: Optional[Any] = Field(
        default=None, 
        description="The suggested new value (can be a string or a new ClauseContent object)."
    )

class AnalysisResponse(BaseModel):
    """
    The top-level container for the list of all suggested changes.
    This is the schema Gemini will be forced to return.
    """
    suggestions: List[SuggestedChange] = Field(
        description="A list of all suggested changes found in the transcript."
    )

router = APIRouter()
DB_PATH = data_path("db.json")

# ---
# 2. SUGGESTION ENDPOINT
# ---

@router.post("/suggest-changes", response_model=AnalysisResponse) # <-- Endpoint name updated
async def analyze_transcript_against_all_docs(
    request: TranscriptRequest
):
    """
    Analyzes a meeting transcript against all documents in db.json
    and returns a structured list of suggested changes.
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

    # --- 2. Build the LLM Prompt ---
    prompt = f"""
    You are an expert legal assistant. Your task is to analyze a meeting transcript and compare it against a database of legal documents. You must find all specific, actionable changes discussed in the transcript and map them to the correct document and clause in the database.

    STRICTLY follow the 'AnalysisResponse' JSON schema you have been given.

    ---
    HERE IS THE ENTIRE DOCUMENT DATABASE (db.json):
    {db_json_string}
    ---

    HERE IS THE MEETING TRANSCRIPT:
    {request.transcript}
    ---

    **CRUCIAL INSTRUCTIONS FOR ANALYSIS:**
    1.  **Natural Language Mapping:** The transcript will use natural, conversational language, not technical field names. You MUST map this natural language to the correct database fields.
        * **Example 1:** If the transcript says "The parties are 'Global Innovations Inc.' and 'DataWeavers Ltd.'", you must map this to `entity_1_name: "Global Innovations Inc."` and `entity_2_name: "DataWeavers Ltd."`.
        * **Example 2:** If the transcript says "The governing law should be 'State of Delaware'", you must find the 'Governing Law' clause and update its text.
        * **Example 3:** If the transcript says "The agreement was signed 'November 1st, 2025'", you must map this to `execution_date: "2025-11-01"`.

    2.  **Document Identification:** People will refer to documents by their *name* (e.g., "the 'Sample Agreement'") not their `doc_id`. You must use the `doc_name` in the database to find the correct document and then use that document's `doc_id` in your response.

    3.  **Implied Actions:** A user saying "Let's get rid of the 'Liability' clause" implies a `DELETE_CLAUSE` operation. A user saying "We need to add a Force Majeure clause" implies an `ADD_CLAUSE` operation.

    Now, analyze the transcript and extract *all* suggested changes based on these rules.
    """

    # --- 3. Call Groq with JSON mode ---
    try:
        schema_description = json.dumps(AnalysisResponse.model_json_schema(), indent=2)
        prompt_with_schema = f"{prompt}\n\nReturn ONLY valid JSON that strictly matches this schema:\n{schema_description}"

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt_with_schema}],
            response_format={"type": "json_object"}
        )

        json_string_response = response.choices[0].message.content

    except Exception as e:
        print(f"Groq API call failed: {e}")
        raise HTTPException(status_code=500, detail=f"Groq API error: {e}")

    # --- 4. Parse, Validate, and Return ---
    try:
        # Parse the JSON string from Gemini
        response_data = json.loads(json_string_response)
        
        # Validate it one more time with Pydantic (this is fast)
        # This creates the AnalysisResponse object that FastAPI will return
        validated_response = AnalysisResponse(**response_data)
        
        return validated_response

    except json.JSONDecodeError as e:
        print(f"Gemini returned invalid JSON: {e}")
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON format.")
    except Exception as e:
        # This catches Pydantic validation errors
        print(f"LLM data failed validation: {e}")
        raise HTTPException(status_code=500, detail=f"LLM data failed validation: {e}")    
    

# ---
# 3. NEW ENDPOINT: APPLY APPROVED CHANGES
# ---

class ApplyChangesRequest(BaseModel):
    """
    The request body for the apply endpoint. It's a list of 
    the exact 'SuggestedChange' objects that the user approved.
    """
    approved_changes: List[SuggestedChange]

router2 = APIRouter()
@router2.post("/apply-changes")
async def apply_approved_changes(
    request: ApplyChangesRequest
):
    """
    Receives a list of approved 'SuggestedChange' objects and
    writes them to the db.json file.
    """
    
    # --- 1. Load the entire database (Read) ---
    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="db.json not found.")
    
    try:
        with DB_PATH.open("r") as f:
            db_content = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read db.json: {e}")

    # --- 2. Loop through approved changes (Modify) ---
    changes_applied = 0
    for change in request.approved_changes:
        
        doc_id = change.doc_id
        
        # Find the document to modify
        if doc_id not in db_content:
            print(f"Warning: doc_id {doc_id} not found. Skipping change.")
            continue # Skip this change and move to the next

        # Get the specific document
        doc_to_update = db_content[doc_id]

        # --- This is the "Approval Logic" ---
        
        if change.operation_type == "MODIFY_METADATA":
            if change.target_field in doc_to_update:
                doc_to_update[change.target_field] = change.new_value
                changes_applied += 1
            
        # elif change.operation_type == "MODIFY_CLAUSE":
        #     found = False
        #     for clause in doc_to_update.get("clauses", []):
        #         if clause["clause_id"] == change.target_clause_id:
        #             # Update the clause. new_value must be a full ClauseContent object
        #             # The frontend is responsible for sending back the full, edited object.
        #             clause_data = change.new_value 
        #             clause["title"] = clause_data.get("title", clause["title"])
        #             clause["text"] = clause_data.get("text", clause["text"])
        #             changes_applied += 1
        #             found = True
        #             break
        #     if not found:
        #          print(f"Warning: clause_id {change.target_clause_id} not found in doc {doc_id}.")
        
        # elif change.operation_type == "MODIFY_CLAUSE":
        #     found = False
        #     for clause in doc_to_update.get("clauses", []):
        #         if clause["clause_id"] == change.target_clause_id:
                    
        #             clause_data = change.new_value 
                    
        #             # --- THIS IS THE FIX ---
        #             # Check if the new_value is a dictionary.
        #             if not isinstance(clause_data, dict):
        #                 # If it's not a dict, the client sent bad data.
        #                 # We cannot proceed. Log it and skip this change.
        #                 print(f"Warning: MODIFY_CLAUSE for doc {doc_id}, clause {change.target_clause_id} received a string, not a dictionary. Skipping.")
        #                 continue # Go to the next change in the loop
        #             # --- END OF FIX ---
                    
        #             # Now we know clause_data is a dictionary, so this is safe.
        #             clause["title"] = clause_data.get("title", clause["title"])
        #             clause["text"] = clause_data.get("text", clause["text"])
        #             changes_applied += 1
        #             found = True
        #             break
            
        #     if not found:
        #         print(f"Warning: clause_id {change.target_clause_id} not found in doc {doc_id}.")
        elif change.operation_type == "MODIFY_CLAUSE":
            found = False
            for clause in doc_to_update.get("clauses", []):
                if clause["clause_id"] == change.target_clause_id:
                    
                    clause_data = change.new_value 
                    
                    # --- THIS IS THE NEW, SMARTER LOGIC ---
                    if isinstance(clause_data, dict):
                        # It's a full object. Update both title and text.
                        clause["title"] = clause_data.get("title", clause["title"])
                        clause["text"] = clause_data.get("text", clause["text"])
                        changes_applied += 1
                        found = True
                        
                    elif isinstance(clause_data, str):
                        # It's just a string. Only update the text.
                        clause["text"] = clause_data
                        changes_applied += 1
                        found = True
                        
                    else:
                        # Invalid type, log and skip
                        print(f"Warning: MODIFY_CLAUSE for doc {doc_id}, clause {change.target_clause_id} received an invalid data type. Skipping.")
                    # --- END OF NEW LOGIC ---

                    break # Stop looping once we've found and processed the clause
            
            if not found:
                print(f"Warning: clause_id {change.target_clause_id} not found in doc {doc_id}.")

        elif change.operation_type == "ADD_CLAUSE":
            # new_value must be a full ClauseContent object
            doc_to_update.get("clauses", []).append(change.new_value)
            changes_applied += 1
            
        elif change.operation_type == "DELETE_CLAUSE":
            if "clauses" not in doc_to_update:
                continue # No clauses to delete from

            original_clauses_list = doc_to_update.get("clauses", [])
            
            # We check how many clauses we have *before* deleting
            len_before = len(original_clauses_list)
            
            # This is the safe way to delete.
            # We rebuild the list, keeping only the clauses that *do not*
            # match the target_clause_id. This avoids all index-related errors.
            new_clauses_list = [
                clause for clause in original_clauses_list 
                if clause.get("clause_id") != change.target_clause_id
            ]
            
            len_after = len(new_clauses_list)
            
            # If the length is the same, no clause was found/deleted.
            # This is just for logging; it's not an error.
            if len_before == len_after:
                print(f"Warning: DELETE_CLAUSE for doc {doc_id} - clause_id {change.target_clause_id} not found.")
            else:
                changes_applied += 1

            # Assign the newly filtered list back to the document
            doc_to_update["clauses"] = new_clauses_list

    # --- 3. Save the database (Write) ---
    try:
        with DB_PATH.open("w") as f:
            json.dump(db_content, f, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write changes to db.json: {e}")

    return {"status": "success", "changes_applied": changes_applied}

@router.get("/get-db")
async def get_database():
    """
    Returns the entire contents of db.json
    """
    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="Database not found")
    
    try:
        with DB_PATH.open("r") as f:
            db_content = json.load(f)
        return db_content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read database: {str(e)}")
