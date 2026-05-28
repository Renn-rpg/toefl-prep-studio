import json
import os
from pathlib import Path
from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import VocabWord, VocabSettings

DATA_FILE = Path(__file__).parent / "data" / "toefl_vocab.json"


def seed_vocab():
    create_db_and_tables()

    if not DATA_FILE.exists():
        print(f"  [!] {DATA_FILE} not found, skipping vocab seed.")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        words = json.load(f)

    with Session(engine) as session:
        existing_words = {w.word for w in session.exec(select(VocabWord)).all()}
        added = 0

        for w in words:
            if w["word"] in existing_words:
                continue
            vocab = VocabWord(
                word=w["word"],
                phonetic=w.get("phonetic", ""),
                part_of_speech=w.get("part_of_speech", ""),
                definition_en=w.get("definition_en", ""),
                definition_cn=w.get("definition_cn", ""),
                example_sentences_json=json.dumps(w.get("example_sentences", []), ensure_ascii=False),
                frequency_rank=w.get("frequency_rank", 0),
                tags_json=json.dumps(w.get("tags", []), ensure_ascii=False),
                difficulty=w.get("difficulty", 1),
            )
            session.add(vocab)
            added += 1

        settings = session.exec(select(VocabSettings)).first()
        if not settings:
            session.add(VocabSettings())

        session.commit()

        if added > 0:
            print(f"  [OK] Seeded {added} new vocab words ({len(existing_words)} already existed).")
        else:
            print(f"  [!] Vocab words already seeded ({len(existing_words)} words), skipping.")


if __name__ == "__main__":
    seed_vocab()
