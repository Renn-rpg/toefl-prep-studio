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
        # Load all existing words into a dict for quick lookup
        existing_map = {w.word: w for w in session.exec(select(VocabWord)).all()}
        added = 0
        updated = 0
        # Track newly added words within this batch to avoid duplicate inserts
        newly_added = set(existing_map.keys())

        for w in words:
            word_str = w["word"]
            if word_str in existing_map:
                # Upsert: update frequency_rank, tags, difficulty if they changed
                existing = existing_map[word_str]
                new_rank = w.get("frequency_rank", 0)
                new_tags = json.dumps(w.get("tags", []), ensure_ascii=False)
                new_diff = w.get("difficulty", 1)

                if existing.frequency_rank != new_rank or existing.tags_json != new_tags or existing.difficulty != new_diff:
                    existing.frequency_rank = new_rank
                    existing.tags_json = new_tags
                    existing.difficulty = new_diff
                    session.add(existing)
                    updated += 1
            elif word_str not in newly_added:
                vocab = VocabWord(
                    word=word_str,
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
                newly_added.add(word_str)
                added += 1

        settings = session.exec(select(VocabSettings)).first()
        if not settings:
            session.add(VocabSettings())

        session.commit()

        if added > 0 or updated > 0:
            print(f"  [OK] Seeded {added} new words, updated {updated} existing ({len(existing_map)} total).")
        else:
            print(f"  [!] No changes needed ({len(existing_map)} words already up to date).")


if __name__ == "__main__":
    seed_vocab()
