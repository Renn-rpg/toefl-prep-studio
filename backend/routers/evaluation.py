from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import Optional

from database import get_session
from models import StageEvaluation

router = APIRouter()


class EvalRequest(BaseModel):
    stage_type: str  # weekly / monthly
    week_number: Optional[int] = None
    reading_score: int
    listening_score: int
    speaking_score: int
    writing_score: int
    notes: Optional[str] = None


@router.post("/stage")
def create_evaluation(req: EvalRequest, session: Session = Depends(get_session)):
    total = req.reading_score + req.listening_score + req.speaking_score + req.writing_score
    ev = StageEvaluation(
        stage_type=req.stage_type,
        week_number=req.week_number,
        reading_score=req.reading_score,
        listening_score=req.listening_score,
        speaking_score=req.speaking_score,
        writing_score=req.writing_score,
        total_score=total,
        notes=req.notes,
    )
    session.add(ev)
    session.commit()
    session.refresh(ev)
    return ev


@router.get("/history")
def get_history(session: Session = Depends(get_session)):
    evals = session.exec(select(StageEvaluation).order_by(StageEvaluation.id.desc())).all()
    return evals
