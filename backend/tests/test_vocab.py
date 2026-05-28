"""Tests for vocab SRS algorithm and endpoints."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from datetime import datetime
from conftest import test_engine

from main import app
from models import VocabWord, VocabProgress, VocabSettings

client = TestClient(app)


def _seed_words(count=10):
    with Session(test_engine) as s:
        for i in range(count):
            w = VocabWord(
                word=f"testword_{i}",
                phonetic=f"/test_{i}/",
                part_of_speech="n.",
                definition_en=f"definition {i}",
                definition_cn=f"定义{i}",
                example_sentences_json='[{"en":"Example.","cn":"例句。"}]',
                frequency_rank=1000 + i,
                difficulty=(i % 4) + 1,
            )
            s.add(w)
        if not s.exec(select(VocabSettings)).first():
            s.add(VocabSettings())
        s.commit()


# ── SRS algorithm unit tests ──

def test_srs_forgotten_resets():
    from routers.vocab import calculate_next_review
    now = datetime.utcnow()
    prog = VocabProgress(
        word_id=1, status="reviewing", ease_factor=2.5,
        interval_days=5.0, repetitions=4, next_review_at=now,
    )
    result = calculate_next_review(prog, 0)
    assert result["status"] == "learning"
    assert result["repetitions"] == 0
    assert result["ease_factor"] <= 2.3
    assert result["ease_factor"] >= 1.3
    assert result["interval_days"] < 0.01


def test_srs_first_rep():
    from routers.vocab import calculate_next_review
    now = datetime.utcnow()
    prog = VocabProgress(
        word_id=1, status="new", ease_factor=2.5,
        interval_days=0, repetitions=0, next_review_at=now,
    )
    result = calculate_next_review(prog, 2)
    assert result["repetitions"] == 1
    assert result["interval_days"] < 0.01


def test_srs_second_rep():
    from routers.vocab import calculate_next_review
    now = datetime.utcnow()
    prog = VocabProgress(
        word_id=1, status="learning", ease_factor=2.5,
        interval_days=1 / 1440, repetitions=1, next_review_at=now,
    )
    result = calculate_next_review(prog, 2)
    assert result["repetitions"] == 2
    assert 0.005 < result["interval_days"] < 0.01


def test_srs_third_rep():
    from routers.vocab import calculate_next_review
    now = datetime.utcnow()
    prog = VocabProgress(
        word_id=1, status="learning", ease_factor=2.5,
        interval_days=10 / 1440, repetitions=2, next_review_at=now,
    )
    result = calculate_next_review(prog, 2)
    assert result["repetitions"] == 3
    assert 0.99 <= result["interval_days"] <= 1.01


def test_srs_ease_factor_floor():
    from routers.vocab import calculate_next_review
    now = datetime.utcnow()
    prog = VocabProgress(
        word_id=1, status="learning", ease_factor=1.3,
        interval_days=0, repetitions=0, next_review_at=now,
    )
    result = calculate_next_review(prog, 0)
    assert result["ease_factor"] >= 1.3


def test_srs_mastered_after_long_interval():
    from routers.vocab import calculate_next_review
    now = datetime.utcnow()
    prog = VocabProgress(
        word_id=1, status="reviewing", ease_factor=3.0,
        interval_days=12.0, repetitions=5, next_review_at=now,
    )
    result = calculate_next_review(prog, 2)
    assert result["status"] == "mastered"


def test_srs_hard_rating_limits_interval():
    from routers.vocab import calculate_next_review
    now = datetime.utcnow()
    prog = VocabProgress(
        word_id=1, status="reviewing", ease_factor=2.5,
        interval_days=10.0, repetitions=4, next_review_at=now,
    )
    result = calculate_next_review(prog, 1)
    assert result["interval_days"] <= 12.01


def test_srs_easy_rating_boosts_interval():
    from routers.vocab import calculate_next_review
    now = datetime.utcnow()
    prog = VocabProgress(
        word_id=1, status="reviewing", ease_factor=2.5,
        interval_days=6.0, repetitions=4, next_review_at=now,
    )
    result = calculate_next_review(prog, 3)
    assert result["interval_days"] >= 19.0


# ── API endpoint tests ──

def test_vocab_word_list():
    _seed_words(5)
    resp = client.get("/vocab/words?per_page=10")
    assert resp.status_code == 200
    data = resp.json()
    assert "words" in data
    assert "total" in data
    assert data["total"] >= 5


def test_vocab_words_filter_by_difficulty():
    _seed_words(10)
    resp = client.get("/vocab/words?difficulty=1&per_page=5")
    assert resp.status_code == 200
    data = resp.json()
    for w in data["words"]:
        assert w["difficulty"] == 1


def test_vocab_words_filter_by_search():
    with Session(test_engine) as s:
        s.add(VocabWord(word="analysis", difficulty=1, frequency_rank=50))
        s.add(VocabSettings())
        s.commit()

    resp = client.get("/vocab/words?search=analy&per_page=10")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["words"]) >= 1


def test_vocab_session_next_returns_cards():
    _seed_words(5)
    resp = client.get("/vocab/session/next?limit=3")
    assert resp.status_code == 200
    data = resp.json()
    assert "cards" in data
    if data["cards"]:
        card = data["cards"][0]
        for key in ("word_id", "word", "phonetic", "definition_en", "definition_cn", "example_sentences"):
            assert key in card


def test_vocab_session_review():
    _seed_words(1)
    # Get card first to create progress
    c = client.get("/vocab/session/next?limit=1").json()
    if not c["cards"]:
        pytest.skip("No cards returned")
    word_id = c["cards"][0]["word_id"]

    resp = client.post("/vocab/session/review", json={
        "word_id": word_id, "rating": 2, "session_duration_ms": 5000,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["progress"]["status"] in ("learning", "reviewing", "mastered")


def test_vocab_stats():
    _seed_words(5)
    resp = client.get("/vocab/stats")
    assert resp.status_code == 200
    data = resp.json()
    for key in ("today", "all_time", "streak_days", "words_due_today"):
        assert key in data
    for key in ("mastered", "reviewing", "learning", "new"):
        assert key in data["all_time"]


def test_vocab_settings_read():
    _seed_words(1)
    resp = client.get("/vocab/settings")
    assert resp.status_code == 200
    data = resp.json()
    for key in ("daily_new_words", "daily_review_limit", "auto_pronounce", "show_cn_definition"):
        assert key in data


def test_vocab_settings_update():
    _seed_words(1)
    resp = client.get("/vocab/settings")
    current = resp.json()
    resp = client.put("/vocab/settings", json={**current, "daily_new_words": 30, "auto_pronounce": False})
    assert resp.status_code == 200
    data = client.get("/vocab/settings").json()
    assert data["daily_new_words"] == 30
    assert data["auto_pronounce"] is False
    client.put("/vocab/settings", json=current)


def test_vocab_word_detail():
    _seed_words(1)
    words = client.get("/vocab/words?per_page=1").json()["words"]
    if not words:
        pytest.skip("No words in DB")
    word_id = words[0]["id"]
    resp = client.get(f"/vocab/words/{word_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "word" in data
    assert "example_sentences" in data
    assert "progress" in data
