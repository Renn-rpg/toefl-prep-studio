import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import create_db_and_tables
from routers import plan, listening, speaking, reading, writing, mock, evaluation, progress, vocab, translation

app = FastAPI(title="TOEFL Prep API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve generated audio files
os.makedirs(os.path.join(os.path.dirname(__file__), "audio"), exist_ok=True)
app.mount("/audio", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "audio")), name="audio")

app.include_router(plan.router, prefix="/plan", tags=["plan"])
app.include_router(listening.router, prefix="/listening", tags=["listening"])
app.include_router(speaking.router, prefix="/speaking", tags=["speaking"])
app.include_router(reading.router, prefix="/reading", tags=["reading"])
app.include_router(writing.router, prefix="/writing", tags=["writing"])
app.include_router(mock.router, prefix="/mock", tags=["mock"])
app.include_router(evaluation.router, prefix="/evaluation", tags=["evaluation"])
app.include_router(progress.router, prefix="/progress", tags=["progress"])
app.include_router(vocab.router, prefix="/vocab", tags=["vocab"])
app.include_router(translation.router, prefix="/translation", tags=["translation"])
