from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func, col
from database import get_session
from models import VocabWord, VocabProgress, VocabStudySession, VocabSettings

router = APIRouter()


def calculate_next_review(progress: VocabProgress, rating: int) -> dict:
    MIN_EF = 1.3
    now = datetime.utcnow()

    if rating == 0:
        return {
            "status": "learning",
            "repetitions": 0,
            "interval_days": 1 / 1440,
            "ease_factor": max(MIN_EF, progress.ease_factor - 0.2),
            "next_review_at": now + timedelta(minutes=1),
        }

    new_reps = progress.repetitions + 1
    ef = progress.ease_factor + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02))
    ef = max(MIN_EF, ef)

    if new_reps == 1:
        interval = 1 / 1440
    elif new_reps == 2:
        interval = 10 / 1440
    elif new_reps == 3:
        interval = 1.0
    else:
        interval = progress.interval_days * ef

    if rating == 1:
        interval = min(interval, progress.interval_days * 1.2) if progress.interval_days > 0 else interval
    elif rating == 3:
        interval = interval * 1.3

    if interval >= 30:
        status = "mastered"
    elif interval >= 1:
        status = "reviewing"
    else:
        status = "learning"

    return {
        "status": status,
        "repetitions": new_reps,
        "interval_days": round(interval, 4),
        "ease_factor": round(ef, 4),
        "next_review_at": now + timedelta(days=interval),
    }


@router.get("/words")
def list_words(
    status: Optional[str] = None,
    difficulty: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_session),
):
    query = select(VocabWord)
    if difficulty:
        query = query.where(VocabWord.difficulty == difficulty)
    if search:
        query = query.where(col(VocabWord.word).contains(search))
    query = query.order_by(VocabWord.frequency_rank)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    words = session.exec(query.offset((page - 1) * per_page).limit(per_page)).all()

    result = []
    for w in words:
        prog = session.exec(
            select(VocabProgress).where(VocabProgress.word_id == w.id)
        ).first()
        word_status = prog.status if prog else "new"
        if status and word_status != status:
            continue
        result.append({
            "id": w.id, "word": w.word, "phonetic": w.phonetic,
            "part_of_speech": w.part_of_speech, "difficulty": w.difficulty,
            "definition_cn": w.definition_cn, "status": word_status,
        })

    return {"words": result, "total": total, "page": page, "per_page": per_page}


@router.get("/words/{word_id}")
def get_word(word_id: int, session: Session = Depends(get_session)):
    word = session.get(VocabWord, word_id)
    if not word:
        return {"error": "not found"}
    prog = session.exec(
        select(VocabProgress).where(VocabProgress.word_id == word_id)
    ).first()
    import json
    return {
        "id": word.id, "word": word.word, "phonetic": word.phonetic,
        "part_of_speech": word.part_of_speech,
        "definition_en": word.definition_en, "definition_cn": word.definition_cn,
        "example_sentences": json.loads(word.example_sentences_json),
        "tags": json.loads(word.tags_json),
        "difficulty": word.difficulty, "frequency_rank": word.frequency_rank,
        "progress": {
            "status": prog.status if prog else "new",
            "ease_factor": prog.ease_factor if prog else 2.5,
            "interval_days": prog.interval_days if prog else 0,
            "repetitions": prog.repetitions if prog else 0,
            "next_review_at": prog.next_review_at.isoformat() if prog else None,
            "total_reviews": prog.total_reviews if prog else 0,
            "correct_count": prog.correct_count if prog else 0,
        },
    }


@router.get("/session/next")
def get_next_cards(
    limit: int = Query(20, ge=1, le=50),
    session: Session = Depends(get_session),
):
    import json
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")

    settings = session.exec(select(VocabSettings)).first()
    daily_new = settings.daily_new_words if settings else 20

    due = session.exec(
        select(VocabProgress)
        .where(VocabProgress.next_review_at <= now)
        .where(VocabProgress.status != "mastered")
        .order_by(VocabProgress.next_review_at)
        .limit(limit)
    ).all()

    cards = []
    for p in due:
        word = session.get(VocabWord, p.word_id)
        if word:
            cards.append({
                "word_id": word.id, "word": word.word, "phonetic": word.phonetic,
                "part_of_speech": word.part_of_speech,
                "definition_en": word.definition_en, "definition_cn": word.definition_cn,
                "example_sentences": json.loads(word.example_sentences_json),
                "status": p.status, "repetitions": p.repetitions,
            })

    remaining = limit - len(cards)
    if remaining > 0:
        today_session = session.exec(
            select(VocabStudySession).where(VocabStudySession.session_date == today)
        ).first()
        new_today = today_session.new_words_count if today_session else 0
        can_add = max(0, daily_new - new_today)
        fetch = min(remaining, can_add)

        if fetch > 0:
            known_ids = session.exec(select(VocabProgress.word_id)).all()
            query = select(VocabWord).order_by(VocabWord.difficulty, VocabWord.frequency_rank)
            if known_ids:
                query = query.where(col(VocabWord.id).notin_(known_ids))
            new_words = session.exec(query.limit(fetch)).all()

            for w in new_words:
                p = VocabProgress(word_id=w.id, status="new", next_review_at=now)
                session.add(p)
                cards.append({
                    "word_id": w.id, "word": w.word, "phonetic": w.phonetic,
                    "part_of_speech": w.part_of_speech,
                    "definition_en": w.definition_en, "definition_cn": w.definition_cn,
                    "example_sentences": json.loads(w.example_sentences_json),
                    "status": "new", "repetitions": 0,
                })
            session.commit()

    return {"cards": cards, "total": len(cards)}


@router.post("/session/review")
def review_word(
    data: dict,
    session: Session = Depends(get_session),
):
    word_id = data["word_id"]
    rating = data["rating"]
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")

    prog = session.exec(
        select(VocabProgress).where(VocabProgress.word_id == word_id)
    ).first()
    if not prog:
        prog = VocabProgress(word_id=word_id, status="new", next_review_at=now)
        session.add(prog)
        session.commit()
        session.refresh(prog)

    was_new = prog.status == "new"
    updates = calculate_next_review(prog, rating)

    prog.status = updates["status"]
    prog.repetitions = updates["repetitions"]
    prog.interval_days = updates["interval_days"]
    prog.ease_factor = updates["ease_factor"]
    prog.next_review_at = updates["next_review_at"]
    prog.last_reviewed_at = now
    prog.total_reviews += 1
    if rating > 0:
        prog.correct_count += 1

    session.add(prog)

    study = session.exec(
        select(VocabStudySession).where(VocabStudySession.session_date == today)
    ).first()
    if not study:
        study = VocabStudySession(session_date=today)
        session.add(study)
        session.commit()
        session.refresh(study)

    if was_new:
        study.new_words_count += 1
    else:
        study.reviewed_words_count += 1
    study.total_count += 1
    if rating > 0:
        study.correct_count += 1
    study.duration_seconds += data.get("session_duration_ms", 0) // 1000
    session.add(study)

    session.commit()

    return {
        "status": "ok",
        "progress": {
            "status": prog.status,
            "interval_days": prog.interval_days,
            "next_review_at": prog.next_review_at.isoformat(),
            "repetitions": prog.repetitions,
        },
    }


@router.get("/stats")
def get_stats(session: Session = Depends(get_session)):
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")

    today_session = session.exec(
        select(VocabStudySession).where(VocabStudySession.session_date == today)
    ).first()

    total_words = session.exec(select(func.count(VocabWord.id))).one()

    status_counts = {"new": 0, "learning": 0, "reviewing": 0, "mastered": 0}
    progresses = session.exec(select(VocabProgress)).all()
    known_count = 0
    for p in progresses:
        if p.status in status_counts:
            status_counts[p.status] += 1
        known_count += 1
    status_counts["new"] = total_words - known_count

    streak = 0
    d = now.date()
    while True:
        ds = d.strftime("%Y-%m-%d")
        s = session.exec(
            select(VocabStudySession).where(VocabStudySession.session_date == ds)
        ).first()
        if s and s.total_count > 0:
            streak += 1
            d -= timedelta(days=1)
        else:
            break

    due_count = session.exec(
        select(func.count(VocabProgress.id))
        .where(VocabProgress.next_review_at <= now)
        .where(VocabProgress.status != "mastered")
    ).one()

    return {
        "today": {
            "new_words": today_session.new_words_count if today_session else 0,
            "reviewed_words": today_session.reviewed_words_count if today_session else 0,
            "accuracy": (
                round(today_session.correct_count / today_session.total_count, 2)
                if today_session and today_session.total_count > 0
                else 0
            ),
            "minutes_studied": (today_session.duration_seconds // 60) if today_session else 0,
        },
        "all_time": {
            "total_words": total_words,
            "mastered": status_counts["mastered"],
            "reviewing": status_counts["reviewing"],
            "learning": status_counts["learning"],
            "new": status_counts["new"],
        },
        "streak_days": streak,
        "words_due_today": due_count,
    }


@router.get("/settings")
def get_settings(session: Session = Depends(get_session)):
    s = session.exec(select(VocabSettings)).first()
    if not s:
        s = VocabSettings()
        session.add(s)
        session.commit()
        session.refresh(s)
    return {
        "daily_new_words": s.daily_new_words,
        "daily_review_limit": s.daily_review_limit,
        "auto_pronounce": s.auto_pronounce,
        "show_cn_definition": s.show_cn_definition,
    }


@router.put("/settings")
def update_settings(data: dict, session: Session = Depends(get_session)):
    s = session.exec(select(VocabSettings)).first()
    if not s:
        s = VocabSettings()
        session.add(s)
        session.commit()
        session.refresh(s)

    for key in ["daily_new_words", "daily_review_limit", "auto_pronounce", "show_cn_definition"]:
        if key in data:
            setattr(s, key, data[key])
    session.add(s)
    session.commit()
    return {"status": "ok"}
