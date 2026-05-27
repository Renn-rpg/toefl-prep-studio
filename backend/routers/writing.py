import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from deepseek_client import chat_json
from models import WritingSession, WritingPrompt

router = APIRouter()


@router.get("/prompts")
def get_prompts(session: Session = Depends(get_session)):
    prompts = session.exec(select(WritingPrompt)).all()
    return [{"id": p.id, "task_type": p.task_type, "prompt": p.prompt} for p in prompts]


class SubmitRequest(BaseModel):
    task_type: str
    prompt: str
    essay_text: str


@router.post("/submit")
async def submit_writing(req: SubmitRequest, session: Session = Depends(get_session)):
    system = """你是一位专业的 TOEFL 写作考官。请用中文评价考生的作文，并返回 JSON：
{
  "task_achievement_score": <0-30>,
  "coherence_score": <0-30>,
  "language_score": <0-30>,
  "feedback": {
    "band_descriptor": "优秀 / 良好 / 一般 / 较弱",
    "strengths": ["优点1", "优点2"],
    "suggestions": ["改进建议1", "改进建议2"],
    "corrected_excerpt": "对文中一个薄弱句子的修改示范（用英文写修改后的句子）"
  }
}
注意：除 corrected_excerpt 可用英文外，其余 feedback 内容必须用中文。"""
    user = f"""题目类型：{req.task_type}
题目：{req.prompt}
考生作文：
{req.essay_text}
请评价这篇 TOEFL 写作。"""

    result = await chat_json(system, user, temperature=0.3)

    total = (result.get("task_achievement_score", 0) +
             result.get("coherence_score", 0) +
             result.get("language_score", 0))

    ws = WritingSession(
        task_type=req.task_type,
        prompt=req.prompt,
        essay_text=req.essay_text,
        task_achievement_score=result.get("task_achievement_score", 0),
        coherence_score=result.get("coherence_score", 0),
        language_score=result.get("language_score", 0),
        total_score=total,
        feedback_json=json.dumps(result.get("feedback", {}), ensure_ascii=False),
    )
    session.add(ws)
    session.commit()
    session.refresh(ws)
    return {
        "session_id": ws.id,
        "task_achievement_score": ws.task_achievement_score,
        "coherence_score": ws.coherence_score,
        "language_score": ws.language_score,
        "total_score": ws.total_score,
        "feedback_json": ws.feedback_json,
    }


@router.get("/history")
def get_history(session: Session = Depends(get_session)):
    sessions = session.exec(select(WritingSession).order_by(WritingSession.id.desc()).limit(20)).all()
    return sessions
