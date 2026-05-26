import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from deepseek_client import chat_json
from models import SpeakingSession, SpeakingPrompt

router = APIRouter()


@router.get("/prompts")
def get_prompts(session: Session = Depends(get_session)):
    prompts = session.exec(select(SpeakingPrompt)).all()
    return [{"id": p.id, "task_type": p.task_type, "prompt": p.prompt} for p in prompts]


class EvaluateRequest(BaseModel):
    task_type: str
    prompt: str
    transcript: str


@router.post("/evaluate")
async def evaluate_speaking(req: EvaluateRequest, session: Session = Depends(get_session)):
    system = """You are a TOEFL speaking examiner. Evaluate the response and return JSON:
{
  "pronunciation_score": <0-30>,
  "fluency_score": <0-30>,
  "content_score": <0-30>,
  "feedback": {
    "band_descriptor": "Good / Fair / Limited / Weak",
    "strengths": ["strength1", "strength2"],
    "improvements": ["area1", "area2"]
  }
}"""
    user = f"""Task type: {req.task_type}
Prompt: {req.prompt}
Transcript: {req.transcript}
Evaluate this TOEFL speaking response."""

    result = await chat_json(system, user, temperature=0.3)

    total = (result.get("pronunciation_score", 0) +
             result.get("fluency_score", 0) +
             result.get("content_score", 0))

    sp = SpeakingSession(
        task_type=req.task_type,
        prompt=req.prompt,
        transcript=req.transcript,
        pronunciation_score=result.get("pronunciation_score", 0),
        fluency_score=result.get("fluency_score", 0),
        content_score=result.get("content_score", 0),
        total_score=total,
        feedback_json=json.dumps(result.get("feedback", {}), ensure_ascii=False),
    )
    session.add(sp)
    session.commit()
    session.refresh(sp)
    return {
        "session_id": sp.id,
        "pronunciation_score": sp.pronunciation_score,
        "fluency_score": sp.fluency_score,
        "content_score": sp.content_score,
        "total_score": sp.total_score,
        "feedback_json": sp.feedback_json,
    }


@router.get("/history")
def get_history(session: Session = Depends(get_session)):
    sessions = session.exec(select(SpeakingSession).order_by(SpeakingSession.id.desc()).limit(20)).all()
    return sessions
