"""Idempotent migration: add enrichment columns to vocab tables."""
import sqlite3
import sys


def get_existing_columns(cursor, table):
    cursor.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in cursor.fetchall()}


def add_column_if_missing(cursor, table, column, col_type, default):
    cols = get_existing_columns(cursor, table)
    if column not in cols:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type} DEFAULT {default}")
        print(f"  + {table}.{column}")
    else:
        print(f"  . {table}.{column} (already exists)")


def migrate(db_path="toefl.db"):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    print("Migrating VocabWord …")
    add_column_if_missing(cur, "vocabword", "phonetic_uk", "TEXT", "''")
    add_column_if_missing(cur, "vocabword", "phonetic_us", "TEXT", "''")
    add_column_if_missing(cur, "vocabword", "syllables", "TEXT", "''")
    add_column_if_missing(cur, "vocabword", "collocations_json", "TEXT", "'[]'")
    add_column_if_missing(cur, "vocabword", "derivatives_json", "TEXT", "'[]'")
    add_column_if_missing(cur, "vocabword", "word_root_json", "TEXT", "'{}'")

    print("Migrating VocabProgress …")
    add_column_if_missing(cur, "vocabprogress", "mastery_stage", "INTEGER", "0")

    print("Migrating VocabSettings …")
    add_column_if_missing(cur, "vocabsettings", "preferred_accent", "TEXT", "'us'")
    add_column_if_missing(cur, "vocabsettings", "sound_effects", "BOOLEAN", "1")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "toefl.db"
    migrate(path)
