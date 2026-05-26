import json
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from deepseek_client import chat_json
from models import StudyPlan

router = APIRouter()


class PlanRequest(BaseModel):
    current_level: str
    target_score: int
    exam_date: str
    weekly_hours: int


@router.post("/generate")
async def generate_plan(req: PlanRequest, session: Session = Depends(get_session)):
    system = """You are a TOEFL expert coach. Generate a personalized weekly study plan as JSON.
Output format:
{
  "weeks": [
    {
      "week": 1,
      "focus": "Reading & Vocabulary",
      "daily_tasks": [
        {"day": "Monday", "tasks": ["Read 1 TPO passage", "Learn 20 vocab words"]},
        ...
      ],
      "weekly_goal": "Complete 3 reading passages"
    }
  ],
  "total_weeks": 8,
  "study_tips": ["tip1", "tip2"]
}"""
    user = f"""Create a TOEFL study plan for:
- Current level: {req.current_level}
- Target score: {req.target_score}/120
- Exam date: {req.exam_date}
- Available hours per week: {req.weekly_hours}
Generate a realistic week-by-week plan."""

    plan_data = await chat_json(system, user, temperature=0.7)

    plan = StudyPlan(
        current_level=req.current_level,
        target_score=req.target_score,
        exam_date=req.exam_date,
        weekly_hours=req.weekly_hours,
        plan_json=json.dumps(plan_data, ensure_ascii=False),
    )
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return {"id": plan.id, "plan": plan_data}


@router.get("/latest")
def get_latest_plan(session: Session = Depends(get_session)):
    plans = session.exec(select(StudyPlan).order_by(StudyPlan.id.desc()).limit(1)).all()
    if not plans:
        return {"plan": None}
    p = plans[0]
    return {"id": p.id, "plan": json.loads(p.plan_json), "meta": {
        "current_level": p.current_level,
        "target_score": p.target_score,
        "exam_date": p.exam_date,
        "weekly_hours": p.weekly_hours,
    }}
