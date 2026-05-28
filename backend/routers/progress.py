import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select, func

from database import get_session
from models import DailyActivity, ListeningSession, SpeakingSession, ReadingSession, WritingSession, StageEvaluation

router = APIRouter()


class ActivityRequest(BaseModel):
    activity_date: str
    minutes_studied: int
    modules_practiced: str = "[]"


@router.post("/activity")
def log_activity(req: ActivityRequest, session: Session = Depends(get_session)):
    existing = session.exec(
        select(DailyActivity).where(DailyActivity.activity_date == req.activity_date)
    ).first()

    if existing:
        existing.minutes_studied += req.minutes_studied
        existing_modules = set(json.loads(existing.modules_practiced))
        new_modules = set(json.loads(req.modules_practiced))
        existing.modules_practiced = json.dumps(list(existing_modules | new_modules))
        session.add(existing)
        session.commit()
    else:
        activity = DailyActivity(
            activity_date=req.activity_date,
            minutes_studied=req.minutes_studied,
            modules_practiced=req.modules_practiced,
        )
        session.add(activity)
        try:
            session.commit()
        except Exception:
            session.rollback()
            existing = session.exec(
                select(DailyActivity).where(DailyActivity.activity_date == req.activity_date)
            ).first()
            if existing:
                existing.minutes_studied += req.minutes_studied
                existing_modules = set(json.loads(existing.modules_practiced))
                new_modules = set(json.loads(req.modules_practiced))
                existing.modules_practiced = json.dumps(list(existing_modules | new_modules))
                session.add(existing)
                session.commit()
            else:
                raise

    return {"status": "ok"}


@router.get("/dashboard")
def get_dashboard(session: Session = Depends(get_session)):
    # Section averages
    def avg_score(model, score_field):
        results = session.exec(select(model)).all()
        if not results:
            return 0
        scores = [getattr(r, score_field) for r in results]
        return round(sum(scores) / len(scores), 1)

    listening_avg = avg_score(ListeningSession, "score")
    reading_avg = avg_score(ReadingSession, "score")
    speaking_avg = avg_score(SpeakingSession, "total_score")
    writing_avg = avg_score(WritingSession, "total_score")

    # Study streak
    activities = session.exec(
        select(DailyActivity).order_by(DailyActivity.activity_date.desc())
    ).all()
    streak = 0
    today = datetime.utcnow().date()
    for i, activity in enumerate(activities):
        expected = today - timedelta(days=i)
        if activity.activity_date == str(expected):
            streak += 1
        else:
            break

    # Heatmap (last 90 days)
    heatmap = [
        {"date": a.activity_date, "minutes": a.minutes_studied}
        for a in activities[:90]
    ]

    # Total minutes studied
    total_minutes = sum(a.minutes_studied for a in activities)

    # Latest stage scores for radar chart
    latest_eval = session.exec(
        select(StageEvaluation).order_by(StageEvaluation.id.desc()).limit(1)
    ).first()
    radar = {
        "reading": latest_eval.reading_score if latest_eval else reading_avg,
        "listening": latest_eval.listening_score if latest_eval else listening_avg,
        "speaking": latest_eval.speaking_score if latest_eval else speaking_avg,
        "writing": latest_eval.writing_score if latest_eval else writing_avg,
    }

    return {
        "streak_days": streak,
        "total_minutes": total_minutes,
        "section_averages": {
            "listening": listening_avg,
            "reading": reading_avg,
            "speaking": speaking_avg,
            "writing": writing_avg,
        },
        "radar": radar,
        "heatmap": heatmap,
    }
