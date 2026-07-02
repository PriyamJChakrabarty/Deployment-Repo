from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.transcribe import router as transcribe_router
from routes.extract import router as extract_router
from routes.actions import router as actions_router
from api.chatbot import router as chatbot_router
from routes.ocr_upload import router as ocr_upload_router
from routes.suggest_and_implement_changes import router as suggest_changes_router
from routes.suggest_and_implement_changes import router2 as apply_changes_router
from routes.query_docs import router as query_doc_router
# from routes.map_clauses import router as map_clauses_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transcribe_router)
app.include_router(extract_router, prefix="/api")
app.include_router(actions_router, prefix="/api")
app.include_router(chatbot_router)
app.include_router(ocr_upload_router, prefix="/api")
app.include_router(suggest_changes_router, prefix="/api")
app.include_router(apply_changes_router, prefix="/api")
app.include_router(query_doc_router,prefix="/api")
# app.include_router(map_clauses_router, prefix="/api")

@app.get("/")
async def root():
    return {"status": "OK"}
