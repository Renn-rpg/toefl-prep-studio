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
    system = """你是一位资深 TOEFL 备考教练。请用中文生成个性化的周计划 JSON。
输出格式：
{
  "weeks": [
    {
      "week": 1,
      "focus": "阅读与词汇",
      "daily_tasks": [
        {"day": "周一", "tasks": ["精读 1 篇 TPO 阅读", "背诵 20 个核心词汇"]},
        ...
      ],
      "weekly_goal": "完成 3 篇阅读并整理错题"
    }
  ],
  "total_weeks": 8,
  "study_tips": ["每天坚持背单词", "做完题后复盘错因"]
}
注意：所有内容必须用中文，day 用"周一"到"周日"。"""
    user = f"""请为以下学员定制 TOEFL 备考计划：
- 当前水平：{req.current_level}
- 目标分数：{req.target_score}/120
- 考试日期：{req.exam_date}
- 每周可用学习时间：{req.weekly_hours} 小时
请生成切实可行的逐周计划，包含每日具体任务。"""

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
