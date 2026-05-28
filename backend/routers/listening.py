import json
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import ListeningPassage, ListeningSession
from audio_generator import generate_audio, AUDIO_DIR

router = APIRouter()


@router.get("/passages")
def get_passages(session: Session = Depends(get_session)):
    passages = session.exec(select(ListeningPassage)).all()
    return [{"id": p.id, "title": p.title, "difficulty": p.difficulty,
             "passage_type": p.passage_type, "audio_url": p.audio_url} for p in passages]


@router.get("/passages/{passage_id}")
def get_passage(passage_id: int, session: Session = Depends(get_session)):
    p = session.get(ListeningPassage, passage_id)
    if not p:
        raise HTTPException(status_code=404, detail="Passage not found")
    return {
        "id": p.id, "title": p.title, "audio_url": p.audio_url,
        "transcript": p.transcript, "difficulty": p.difficulty,
        "passage_type": p.passage_type,
        "questions": json.loads(p.questions_json),
    }


class AnswerRequest(BaseModel):
    passage_id: int
    answers_json: str
    duration_seconds: int = 0


@router.post("/answer")
def submit_answer(req: AnswerRequest, session: Session = Depends(get_session)):
    passage = session.get(ListeningPassage, req.passage_id)
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")

    questions = json.loads(passage.questions_json)
    user_answers = json.loads(req.answers_json)
    score = sum(1 for q in questions if user_answers.get(str(q["id"])) == q["answer"])

    ls = ListeningSession(
        passage_id=req.passage_id,
        score=score,
        answers_json=req.answers_json,
        duration_seconds=req.duration_seconds,
    )
    session.add(ls)
    session.commit()
    session.refresh(ls)
    return {"session_id": ls.id, "score": score, "total_questions": len(questions)}


@router.post("/generate-audio/{passage_id}")
async def generate_passage_audio(passage_id: int, session: Session = Depends(get_session)):
    passage = session.get(ListeningPassage, passage_id)
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")

    if not passage.transcript:
        raise HTTPException(status_code=400, detail="Passage has no transcript")

    audio_url = await generate_audio(passage.transcript, passage.passage_type, passage_id)
    passage.audio_url = audio_url
    session.add(passage)
    session.commit()

    return {"audio_url": audio_url, "passage_id": passage_id}


@router.post("/upload-audio/{passage_id}")
async def upload_passage_audio(
    passage_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    passage = session.get(ListeningPassage, passage_id)
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")

    if not file.filename or not file.filename.lower().endswith(".mp3"):
        raise HTTPException(status_code=400, detail="Only MP3 files are accepted")

    os.makedirs(AUDIO_DIR, exist_ok=True)
    filepath = os.path.join(AUDIO_DIR, f"{passage_id}.mp3")
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    audio_url = f"/audio/{passage_id}.mp3"
    passage.audio_url = audio_url
    session.add(passage)
    session.commit()

    return {"audio_url": audio_url, "passage_id": passage_id}
