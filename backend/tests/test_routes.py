"""Backend route tests — DeepSeek is mocked throughout."""
import json
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel
from unittest.mock import patch, AsyncMock

from main import app

client = TestClient(app)

MOCK_PLAN = {"weeks": [{"week": 1, "focus": "Reading", "daily_tasks": [{"day": "Monday", "tasks": ["Read passage"]}], "weekly_goal": "Complete 2 passages"}], "total_weeks": 4, "study_tips": ["Study daily"]}
MOCK_SPEAKING = {"pronunciation_score": 25, "fluency_score": 22, "content_score": 20, "feedback": {"band_descriptor": "Good", "strengths": ["Clear"], "improvements": ["Pace"]}}
MOCK_WRITING = {"task_achievement_score": 24, "coherence_score": 22, "language_score": 21, "feedback": {"band_descriptor": "Good", "strengths": ["Well structured"], "suggestions": ["More examples"], "corrected_excerpt": "Better version here."}}


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_plan_generate():
    with patch("routers.plan.chat_json", new_callable=AsyncMock, return_value=MOCK_PLAN):
        r = client.post("/plan/generate", json={"current_level": "intermediate", "target_score": 100, "exam_date": "2025-12-01", "weekly_hours": 10})
    assert r.status_code == 200
    assert "plan" in r.json()
    assert r.json()["plan"]["total_weeks"] == 4


def test_plan_latest_empty():
    r = client.get("/plan/latest")
    assert r.status_code == 200
    assert r.json()["plan"] is None


def test_listening_passages_empty():
    r = client.get("/listening/passages")
    assert r.status_code == 200
    assert r.json() == []


def test_listening_passage_not_found():
    r = client.get("/listening/passages/999")
    assert r.status_code == 404


def test_reading_passages_empty():
    r = client.get("/reading/passages")
    assert r.status_code == 200
    assert r.json() == []


def test_speaking_evaluate():
    with patch("routers.speaking.chat_json", new_callable=AsyncMock, return_value=MOCK_SPEAKING):
        r = client.post("/speaking/evaluate", json={"task_type": "independent", "prompt": "Talk about a hobby.", "transcript": "I enjoy reading books every day."})
    assert r.status_code == 200
    data = r.json()
    assert data["pronunciation_score"] == 25
    assert data["total_score"] == 67


def test_writing_submit():
    with patch("routers.writing.chat_json", new_callable=AsyncMock, return_value=MOCK_WRITING):
        r = client.post("/writing/submit", json={"task_type": "independent", "prompt": "Discuss technology.", "essay_text": "Technology has transformed our lives in many ways. " * 10})
    assert r.status_code == 200
    data = r.json()
    assert data["total_score"] == 67


def test_mock_test_flow():
    start = client.post("/mock/start", json={})
    assert start.status_code == 200
    mock_id = start.json()["mock_test_id"]

    for section in ["reading", "listening", "speaking", "writing"]:
        r = client.put("/mock/submit", json={"mock_test_id": mock_id, "section": section, "score": 20, "duration_seconds": 100})
        assert r.status_code == 200

    results = client.get(f"/mock/results/{mock_id}")
    assert results.status_code == 200
    assert results.json()["total_score"] == 80


def test_evaluation_stage():
    r = client.post("/evaluation/stage", json={"stage_type": "weekly", "week_number": 1, "reading_score": 25, "listening_score": 22, "speaking_score": 20, "writing_score": 21})
    assert r.status_code == 200
    assert r.json()["total_score"] == 88


def test_progress_dashboard_empty():
    r = client.get("/progress/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "streak_days" in data
    assert "section_averages" in data


def test_progress_activity_log():
    r = client.post("/progress/activity", json={"activity_date": "2025-06-01", "minutes_studied": 30, "modules_practiced": '["reading"]'})
    assert r.status_code == 200
    # Upsert: log again same day, minutes should accumulate
    r2 = client.post("/progress/activity", json={"activity_date": "2025-06-01", "minutes_studied": 20, "modules_practiced": '["listening"]'})
    assert r2.status_code == 200
