import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import ListeningPassage, ListeningSession

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
