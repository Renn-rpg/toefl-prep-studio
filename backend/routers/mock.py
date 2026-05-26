import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from database import get_session
from models import MockTest

router = APIRouter()


@router.post("/start")
def start_mock(session: Session = Depends(get_session)):
    mock = MockTest(status="in_progress")
    session.add(mock)
    session.commit()
    session.refresh(mock)
    return {"mock_test_id": mock.id, "status": mock.status}


class SectionSubmit(BaseModel):
    mock_test_id: int
    section: str  # reading / listening / speaking / writing
    answers_json: str = "{}"
    duration_seconds: int = 0
    score: int = 0


@router.put("/submit")
def submit_section(req: SectionSubmit, session: Session = Depends(get_session)):
    mock = session.get(MockTest, req.mock_test_id)
    if not mock:
        raise HTTPException(status_code=404, detail="Mock test not found")

    setattr(mock, f"{req.section}_score", req.score)
    mock.duration_seconds += req.duration_seconds

    # Check if all sections submitted
    scores = {s: getattr(mock, f"{s}_score") for s in ["reading", "listening", "speaking", "writing"]}
    if all(v is not None for v in scores.values()):
        mock.total_score = sum(scores.values())
        mock.status = "completed"

    session.add(mock)
    session.commit()
    session.refresh(mock)
    return {"mock_test_id": mock.id, "status": mock.status}


@router.get("/results/{mock_test_id}")
def get_results(mock_test_id: int, session: Session = Depends(get_session)):
    mock = session.get(MockTest, mock_test_id)
    if not mock:
        raise HTTPException(status_code=404, detail="Mock test not found")
    return mock


@router.get("/history")
def get_history(session: Session = Depends(get_session)):
    from sqlmodel import select
    tests = session.exec(select(MockTest).order_by(MockTest.id.desc()).limit(10)).all()
    return tests
