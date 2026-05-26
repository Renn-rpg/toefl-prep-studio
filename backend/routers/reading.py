import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import ReadingPassage, ReadingSession

router = APIRouter()


@router.get("/passages")
def get_passages(session: Session = Depends(get_session)):
    passages = session.exec(select(ReadingPassage)).all()
    return [{"id": p.id, "title": p.title, "difficulty": p.difficulty} for p in passages]


@router.get("/passages/{passage_id}")
def get_passage(passage_id: int, session: Session = Depends(get_session)):
    p = session.get(ReadingPassage, passage_id)
    if not p:
        raise HTTPException(status_code=404, detail="Passage not found")
    return {
        "id": p.id, "title": p.title, "content": p.content,
        "difficulty": p.difficulty,
        "questions": json.loads(p.questions_json),
        "vocab_highlights": json.loads(p.vocab_highlights_json),
    }


class AnswerRequest(BaseModel):
    passage_id: int
    answers_json: str
    duration_seconds: int = 0


@router.post("/answer")
def submit_answer(req: AnswerRequest, session: Session = Depends(get_session)):
    passage = session.get(ReadingPassage, req.passage_id)
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found")

    questions = json.loads(passage.questions_json)
    user_answers = json.loads(req.answers_json)
    score = sum(1 for q in questions if user_answers.get(str(q["id"])) == q["answer"])

    rs = ReadingSession(
        passage_id=req.passage_id,
        score=score,
        answers_json=req.answers_json,
        duration_seconds=req.duration_seconds,
    )
    session.add(rs)
    session.commit()
    session.refresh(rs)
    return {"session_id": rs.id, "score": score, "total_questions": len(questions)}
