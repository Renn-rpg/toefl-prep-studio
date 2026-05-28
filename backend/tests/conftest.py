"""Shared test fixtures — in-memory SQLite for all tests."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from sqlmodel import Session, create_engine, SQLModel
from main import app
from database import get_session

TEST_DB = "sqlite:///./test_toefl.db"
test_engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})

def override_session():
    with Session(test_engine) as session:
        yield session

app.dependency_overrides[get_session] = override_session


@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(test_engine)
    yield
    SQLModel.metadata.drop_all(test_engine)
