from datetime import date, datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class StudyPlan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    current_level: str  # beginner / intermediate / advanced
    target_score: int
    exam_date: str
    weekly_hours: int
    plan_json: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ListeningPassage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    audio_url: str
    transcript: str
    difficulty: str  # easy / medium / hard
    passage_type: str  # lecture / conversation
    questions_json: str = "[]"


class ListeningSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    passage_id: int = Field(foreign_key="listeningpassage.id")
    score: int = 0
    answers_json: str = "{}"
    duration_seconds: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SpeakingSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_type: str  # independent / integrated
    prompt: str
    transcript: str
    pronunciation_score: int = 0
    fluency_score: int = 0
    content_score: int = 0
    total_score: int = 0
    feedback_json: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SpeakingPrompt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_type: str
    prompt: str


class ReadingPassage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    content: str
    difficulty: str
    questions_json: str = "[]"
    vocab_highlights_json: str = "[]"


class ReadingSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    passage_id: int = Field(foreign_key="readingpassage.id")
    score: int = 0
    answers_json: str = "{}"
    duration_seconds: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WritingPrompt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_type: str  # independent / integrated
    prompt: str


class WritingSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_type: str
    prompt: str
    essay_text: str
    task_achievement_score: int = 0
    coherence_score: int = 0
    language_score: int = 0
    total_score: int = 0
    feedback_json: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MockTest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    status: str = "in_progress"  # in_progress / completed
    reading_score: Optional[int] = None
    listening_score: Optional[int] = None
    speaking_score: Optional[int] = None
    writing_score: Optional[int] = None
    total_score: Optional[int] = None
    duration_seconds: int = 0
    results_json: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class StageEvaluation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    stage_type: str  # weekly / monthly
    week_number: Optional[int] = None
    reading_score: int = 0
    listening_score: int = 0
    speaking_score: int = 0
    writing_score: int = 0
    total_score: int = 0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DailyActivity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    activity_date: str = Field(index=True, unique=True)
    minutes_studied: int = 0
    modules_practiced: str = "[]"


class VocabWord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    word: str = Field(index=True, unique=True)
    phonetic: str = ""
    phonetic_uk: str = ""
    phonetic_us: str = ""
    syllables: str = ""
    part_of_speech: str = ""
    definition_en: str = ""
    definition_cn: str = ""
    example_sentences_json: str = "[]"
    collocations_json: str = "[]"
    derivatives_json: str = "[]"
    word_root_json: str = "{}"
    frequency_rank: int = 0
    tags_json: str = "[]"
    difficulty: int = 1


class VocabProgress(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    word_id: int = Field(foreign_key="vocabword.id", index=True)
    status: str = "new"
    ease_factor: float = 2.5
    interval_days: float = 0
    repetitions: int = 0
    next_review_at: datetime = Field(default_factory=datetime.utcnow)
    last_reviewed_at: Optional[datetime] = None
    total_reviews: int = 0
    correct_count: int = 0
    bookmarked: bool = False
    mastery_stage: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VocabStudySession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_date: str = Field(index=True)
    new_words_count: int = 0
    reviewed_words_count: int = 0
    correct_count: int = 0
    total_count: int = 0
    duration_seconds: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VocabSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    daily_new_words: int = 20
    daily_review_limit: int = 100
    auto_pronounce: bool = True
    show_cn_definition: bool = True
    preferred_accent: str = "us"
    sound_effects: bool = True
