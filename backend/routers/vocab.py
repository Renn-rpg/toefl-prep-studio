import random
import uuid
from datetime import datetime, timedelta
from typing import Optional
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select, func, col
from database import get_session
from models import VocabWord, VocabProgress, VocabStudySession, VocabSettings

# In-memory quiz session store: quiz_id -> {questions, created_at}
quiz_sessions: dict = {}

router = APIRouter()


class ReviewRequest(BaseModel):
    word_id: int
    rating: int = Field(ge=0, le=3)
    session_duration_ms: int = 0


class UpdateSettingsRequest(BaseModel):
    daily_new_words: Optional[int] = None
    daily_review_limit: Optional[int] = None
    auto_pronounce: Optional[bool] = None
    show_cn_definition: Optional[bool] = None
    preferred_accent: Optional[str] = None
    sound_effects: Optional[bool] = None


class MasteryAnswerRequest(BaseModel):
    word_id: int
    stage: int = Field(ge=1, le=3)
    correct: bool
    action: str = "answer"
    duration_ms: int = 0


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
        raise HTTPException(status_code=404, detail="Word not found")
    prog = session.exec(
        select(VocabProgress).where(VocabProgress.word_id == word_id)
    ).first()
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
    data: ReviewRequest,
    session: Session = Depends(get_session),
):
    word_id = data.word_id
    rating = data.rating
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
    study.duration_seconds += data.session_duration_ms // 1000
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
        "preferred_accent": getattr(s, "preferred_accent", "us"),
        "sound_effects": getattr(s, "sound_effects", True),
    }


@router.put("/settings")
def update_settings(data: UpdateSettingsRequest, session: Session = Depends(get_session)):
    s = session.exec(select(VocabSettings)).first()
    if not s:
        s = VocabSettings()
        session.add(s)
        session.commit()
        session.refresh(s)

    for key in ["daily_new_words", "daily_review_limit", "auto_pronounce", "show_cn_definition", "preferred_accent", "sound_effects"]:
        val = getattr(data, key, None)
        if val is not None:
            setattr(s, key, val)
    session.add(s)
    session.commit()
    return {"status": "ok"}


# ── Quiz endpoints ──

@router.get("/quiz")
def get_quiz(
    mode: str = Query("word_to_def", pattern="^(word_to_def|def_to_word)$"),
    count: int = Query(10, ge=5, le=30),
    session: Session = Depends(get_session),
):
    """Generate a quiz round. mode: word_to_def (show word, pick definition)
    or def_to_word (show definition, pick word)."""
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")

    # Pick target words: due reviews first, then new words
    due = session.exec(
        select(VocabProgress)
        .where(VocabProgress.next_review_at <= now)
        .where(VocabProgress.status != "mastered")
        .order_by(VocabProgress.next_review_at)
        .limit(count)
    ).all()

    target_word_ids = {p.word_id for p in due}
    target_words = []
    for p in due:
        w = session.get(VocabWord, p.word_id)
        if w:
            target_words.append(w)

    # Fill remaining with new words if needed
    remaining = count - len(target_words)
    if remaining > 0:
        known_ids = session.exec(select(VocabProgress.word_id)).all()
        query = select(VocabWord).order_by(VocabWord.difficulty, VocabWord.frequency_rank)
        if known_ids:
            query = query.where(col(VocabWord.id).notin_(known_ids))
        new_words = session.exec(query.limit(remaining)).all()
        for w in new_words:
            if w.id not in target_word_ids:
                target_words.append(w)
                target_word_ids.add(w.id)

    if len(target_words) < 4:
        raise HTTPException(status_code=400, detail="Not enough words for quiz (need at least 4)")

    # Get all words for distractor pool (exclude targets)
    all_other = session.exec(
        select(VocabWord).where(col(VocabWord.id).notin_(target_word_ids))
    ).all()

    quiz_id = str(uuid.uuid4())
    questions = []

    for target in target_words:
        # Pick 3 distractors with same difficulty, different part_of_speech
        same_diff = [w for w in all_other if w.difficulty == target.difficulty and w.part_of_speech != target.part_of_speech]
        if len(same_diff) < 3:
            same_diff = [w for w in all_other if w.difficulty == target.difficulty]
        if len(same_diff) < 3:
            same_diff = all_other
        distractors = random.sample(same_diff, min(3, len(same_diff)))

        if mode == "word_to_def":
            options = []
            for d in [target] + distractors:
                options.append({"text": d.definition_cn, "is_correct": d.id == target.id})
            random.shuffle(options)
            keyed_options = [{"text": o["text"], "key": chr(65 + i)} for i, o in enumerate(options)]
            correct_key = [k["key"] for k, o in zip(keyed_options, options) if o["is_correct"]][0]
            questions.append({
                "word_id": target.id,
                "word": target.word,
                "phonetic": target.phonetic,
                "prompt": target.word,
                "prompt_sub": target.phonetic,
                "options": keyed_options,
                "_correct_key": correct_key,
            })
        else:
            options = []
            for d in [target] + distractors:
                options.append({"text": d.word, "is_correct": d.id == target.id})
            random.shuffle(options)
            keyed_options = [{"text": o["text"], "key": chr(65 + i)} for i, o in enumerate(options)]
            correct_key = [k["key"] for k, o in zip(keyed_options, options) if o["is_correct"]][0]
            questions.append({
                "word_id": target.id,
                "word": target.word,
                "definition_cn": target.definition_cn,
                "prompt": target.definition_cn,
                "prompt_sub": target.part_of_speech,
                "options": keyed_options,
                "_correct_key": correct_key,
            })

    quiz_sessions[quiz_id] = {"questions": questions, "created_at": now}

    clean_questions = []
    for q in questions:
        clean_questions.append({
            "word_id": q["word_id"],
            "prompt": q["prompt"],
            "prompt_sub": q["prompt_sub"],
            "options": q["options"],
            "correct_key": q["_correct_key"],
        })

    return {"quiz_id": quiz_id, "mode": mode, "questions": clean_questions}


class QuizSubmitRequest(BaseModel):
    quiz_id: str
    answers: list[dict]  # [{word_id, selected}]


@router.post("/quiz/submit")
def submit_quiz(data: QuizSubmitRequest, session: Session = Depends(get_session)):
    quiz = quiz_sessions.pop(data.quiz_id, None)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz session expired or not found")

    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")
    results = []
    score = 0

    for ans in data.answers:
        question = next((q for q in quiz["questions"] if q["word_id"] == ans.get("word_id")), None)
        if not question:
            continue
        correct = ans.get("selected") == question["_correct_key"]
        if correct:
            score += 1
            rating = 2
        else:
            rating = 0

        # Update SM-2 progress
        prog = session.exec(
            select(VocabProgress).where(VocabProgress.word_id == question["word_id"])
        ).first()
        if not prog:
            prog = VocabProgress(word_id=question["word_id"], status="new", next_review_at=now)
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

        correct_text = ""
        for opt in question.get("options", []):
            if opt["key"] == question["_correct_key"]:
                correct_text = opt["text"]
                break

        results.append({
            "word_id": question["word_id"],
            "word": question.get("word", ""),
            "selected": ans.get("selected"),
            "correct_answer": question["_correct_key"],
            "correct_answer_text": correct_text,
            "is_correct": correct,
        })

    # Update study session
    study = session.exec(
        select(VocabStudySession).where(VocabStudySession.session_date == today)
    ).first()
    if not study:
        study = VocabStudySession(session_date=today)
        session.add(study)
        session.commit()
        session.refresh(study)
    study.total_count += len(data.answers)
    study.correct_count += score
    session.add(study)
    session.commit()

    return {"score": score, "total": len(data.answers), "results": results}


# ── Bookmark endpoints ──

@router.post("/bookmark/{word_id}")
def add_bookmark(word_id: int, session: Session = Depends(get_session)):
    word = session.get(VocabWord, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    prog = session.exec(
        select(VocabProgress).where(VocabProgress.word_id == word_id)
    ).first()
    if not prog:
        prog = VocabProgress(word_id=word_id, status="new")
        session.add(prog)
        session.commit()
        session.refresh(prog)
    prog.bookmarked = True
    session.add(prog)
    session.commit()
    return {"status": "ok", "bookmarked": True}


@router.delete("/bookmark/{word_id}")
def remove_bookmark(word_id: int, session: Session = Depends(get_session)):
    prog = session.exec(
        select(VocabProgress).where(VocabProgress.word_id == word_id)
    ).first()
    if prog:
        prog.bookmarked = False
        session.add(prog)
        session.commit()
    return {"status": "ok", "bookmarked": False}


@router.get("/bookmarks")
def list_bookmarks(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    session: Session = Depends(get_session),
):
    query = (
        select(VocabWord, VocabProgress)
        .join(VocabProgress, VocabWord.id == VocabProgress.word_id)
        .where(VocabProgress.bookmarked == True)
    )
    if search:
        query = query.where(col(VocabWord.word).contains(search))
    query = query.order_by(VocabWord.word)

    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    rows = session.exec(query.offset((page - 1) * per_page).limit(per_page)).all()

    words = []
    for w, p in rows:
        words.append({
            "id": w.id,
            "word": w.word,
            "phonetic": w.phonetic,
            "part_of_speech": w.part_of_speech,
            "definition_en": w.definition_en,
            "definition_cn": w.definition_cn,
            "example_sentences": json.loads(w.example_sentences_json),
            "difficulty": w.difficulty,
            "status": p.status,
            "bookmarked": True,
        })

    return {"words": words, "total": total, "page": page, "per_page": per_page}


# ── Mastery mode endpoints ──

def _build_mastery_word(word: VocabWord, prog: VocabProgress | None) -> dict:
    """Serialize a VocabWord with enriched data for the mastery session."""
    return {
        "word_id": word.id,
        "word": word.word,
        "phonetic": word.phonetic,
        "phonetic_uk": word.phonetic_uk or word.phonetic,
        "phonetic_us": word.phonetic_us or word.phonetic,
        "syllables": word.syllables or word.word,
        "part_of_speech": word.part_of_speech,
        "definition_en": word.definition_en,
        "definition_cn": word.definition_cn,
        "example_sentences": json.loads(word.example_sentences_json),
        "collocations": json.loads(word.collocations_json) if word.collocations_json else [],
        "derivatives": json.loads(word.derivatives_json) if word.derivatives_json else [],
        "word_root": json.loads(word.word_root_json) if word.word_root_json and word.word_root_json != "{}" else {},
        "mastery_stage": prog.mastery_stage if prog else 0,
        "status": prog.status if prog else "new",
    }


def _generate_options(target: VocabWord, all_words: list[VocabWord], mode: str) -> list[dict]:
    """Generate 4 keyed options (A-D) for a target word."""
    same_diff = [w for w in all_words if w.id != target.id and w.difficulty == target.difficulty]
    if len(same_diff) < 3:
        same_diff = [w for w in all_words if w.id != target.id]
    distractors = random.sample(same_diff, min(3, len(same_diff)))

    if mode == "word_to_def":
        options = [{"text": f"{target.part_of_speech} {target.definition_cn}", "is_correct": True}]
        for d in distractors:
            options.append({"text": f"{d.part_of_speech} {d.definition_cn}", "is_correct": False})
    else:
        options = [{"text": target.word, "is_correct": True}]
        for d in distractors:
            options.append({"text": d.word, "is_correct": False})

    random.shuffle(options)
    keyed = []
    correct_key = ""
    for i, o in enumerate(options):
        key = chr(65 + i)
        keyed.append({"text": o["text"], "key": key})
        if o["is_correct"]:
            correct_key = key
    return keyed, correct_key


@router.get("/mastery/session")
def get_mastery_session(
    limit: int = Query(20, ge=5, le=50),
    session: Session = Depends(get_session),
):
    """Get a mastery study session with enriched word data and pre-generated options."""
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")

    settings = session.exec(select(VocabSettings)).first()
    daily_new = settings.daily_new_words if settings else 20

    # Step 1: words with mastery_stage < 3 that are due (incomplete from last session)
    incomplete = session.exec(
        select(VocabProgress)
        .where(VocabProgress.mastery_stage > 0)
        .where(VocabProgress.mastery_stage < 3)
        .limit(limit)
    ).all()

    target_ids = set()
    targets: list[tuple[VocabWord, VocabProgress]] = []
    for p in incomplete:
        w = session.get(VocabWord, p.word_id)
        if w:
            targets.append((w, p))
            target_ids.add(w.id)

    # Step 2: due reviews
    remaining = limit - len(targets)
    if remaining > 0:
        due_query = (
            select(VocabProgress)
            .where(VocabProgress.next_review_at <= now)
            .where(VocabProgress.status != "mastered")
        )
        if target_ids:
            due_query = due_query.where(col(VocabProgress.word_id).notin_(target_ids))
        due = session.exec(due_query
            .order_by(VocabProgress.next_review_at)
            .limit(remaining)
        ).all()
        for p in due:
            w = session.get(VocabWord, p.word_id)
            if w and w.id not in target_ids:
                targets.append((w, p))
                target_ids.add(w.id)

    # Step 3: new words
    remaining = limit - len(targets)
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
                if w.id not in target_ids:
                    p = VocabProgress(word_id=w.id, status="new", next_review_at=now)
                    session.add(p)
                    targets.append((w, p))
                    target_ids.add(w.id)
            session.commit()

    if len(targets) < 4:
        raise HTTPException(status_code=400, detail="Not enough words (need at least 4)")

    # Get all words for distractor pool
    all_words = session.exec(select(VocabWord)).all()

    words_out = []
    for w, p in targets:
        mw = _build_mastery_word(w, p)
        s1_opts, s1_key = _generate_options(w, all_words, "word_to_def")
        s2_opts, s2_key = _generate_options(w, all_words, "def_to_word")
        mw["stage1_options"] = s1_opts
        mw["stage1_correct_key"] = s1_key
        mw["stage2_options"] = s2_opts
        mw["stage2_correct_key"] = s2_key
        words_out.append(mw)

    return {"words": words_out, "total": len(words_out)}


@router.post("/mastery/answer")
def mastery_answer(
    data: MasteryAnswerRequest,
    session: Session = Depends(get_session),
):
    """Submit a mastery stage answer for a single word."""
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")

    prog = session.exec(
        select(VocabProgress).where(VocabProgress.word_id == data.word_id)
    ).first()
    if not prog:
        prog = VocabProgress(word_id=data.word_id, status="new", next_review_at=now)
        session.add(prog)
        session.commit()
        session.refresh(prog)

    was_new = prog.status == "new"
    session_mastered = False

    if data.correct and data.action == "answer":
        prog.mastery_stage += 1
        if prog.mastery_stage >= 3:
            session_mastered = True
            updates = calculate_next_review(prog, 2)
            prog.status = updates["status"]
            prog.repetitions = updates["repetitions"]
            prog.interval_days = updates["interval_days"]
            prog.ease_factor = updates["ease_factor"]
            prog.next_review_at = updates["next_review_at"]
            prog.last_reviewed_at = now
            prog.total_reviews += 1
            prog.correct_count += 1
            prog.mastery_stage = 0
    else:
        prog.mastery_stage = 0
        updates = calculate_next_review(prog, 0)
        prog.status = updates["status"]
        prog.repetitions = updates["repetitions"]
        prog.interval_days = updates["interval_days"]
        prog.ease_factor = updates["ease_factor"]
        prog.next_review_at = updates["next_review_at"]
        prog.last_reviewed_at = now
        prog.total_reviews += 1

    session.add(prog)

    # Update study session
    study = session.exec(
        select(VocabStudySession).where(VocabStudySession.session_date == today)
    ).first()
    if not study:
        study = VocabStudySession(session_date=today)
        session.add(study)
        session.commit()
        session.refresh(study)

    if was_new and data.stage == 1:
        study.new_words_count += 1
    if data.correct:
        study.correct_count += 1
    study.total_count += 1
    study.duration_seconds += data.duration_ms // 1000
    session.add(study)

    session.commit()

    return {
        "status": "ok",
        "mastery_stage": prog.mastery_stage,
        "session_mastered": session_mastered,
        "progress": {
            "status": prog.status,
            "interval_days": prog.interval_days,
            "next_review_at": prog.next_review_at.isoformat(),
            "repetitions": prog.repetitions,
        },
    }
