"""Batch-enrich vocabulary with UK/US phonetics, collocations, derivatives, word roots via DeepSeek."""
import asyncio
import json
import sqlite3
import sys
import time

from deepseek_client import chat_json

BATCH_SIZE = 15

SYSTEM_PROMPT = """你是一位专业的英语语言学家和词典编辑。请为给定的英语单词提供以下信息，返回严格的 JSON 格式。

对于每个单词，提供：
1. phonetic_uk: 英式音标（IPA格式，如 /ˈænəlaɪz/）
2. phonetic_us: 美式音标（IPA格式）
3. syllables: 音节分割（用中间点分隔，如 "an·a·lyze"）
4. collocations: 3-5个常用搭配短语（数组）
5. derivatives: 2-4个派生词，每个包含 word, pos(词性), cn(中文释义)
6. word_root: 词根词缀信息，包含 root(词根拆分), meaning(词根含义), origin(语源如Greek/Latin)

返回格式：
{
  "words": {
    "analyze": {
      "phonetic_uk": "/ˈænəlaɪz/",
      "phonetic_us": "/ˈænəlaɪz/",
      "syllables": "an·a·lyze",
      "collocations": ["analyze data", "critically analyze", "analyze the results"],
      "derivatives": [
        {"word": "analysis", "pos": "n.", "cn": "分析"},
        {"word": "analytical", "pos": "adj.", "cn": "分析的"},
        {"word": "analyst", "pos": "n.", "cn": "分析师"}
      ],
      "word_root": {
        "root": "ana- (up, back) + -lyze (loosen)",
        "meaning": "分解、松开以检查",
        "origin": "Greek"
      }
    }
  }
}

重要：
- 音标必须准确，注意英美发音差异（如 /ɒ/ vs /ɑː/，/juː/ vs /uː/）
- 搭配要实用且高频
- 派生词要包含常见变形
- 词根分析要准确，如果单词没有明显的词根可拆分，用 root: "(整词)" 并说明词源"""


def get_words_to_enrich(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "SELECT id, word FROM vocabword WHERE phonetic_uk = '' OR phonetic_uk IS NULL ORDER BY id"
    )
    rows = cur.fetchall()
    conn.close()
    return rows


def save_batch(db_path, enriched: dict):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    for word_str, data in enriched.items():
        cur.execute(
            """UPDATE vocabword SET
                phonetic_uk = ?, phonetic_us = ?, syllables = ?,
                collocations_json = ?, derivatives_json = ?, word_root_json = ?
            WHERE word = ?""",
            (
                data.get("phonetic_uk", ""),
                data.get("phonetic_us", ""),
                data.get("syllables", ""),
                json.dumps(data.get("collocations", []), ensure_ascii=False),
                json.dumps(data.get("derivatives", []), ensure_ascii=False),
                json.dumps(data.get("word_root", {}), ensure_ascii=False),
                word_str,
            ),
        )
    conn.commit()
    conn.close()


async def enrich_batch(word_list: list[str]) -> dict:
    user_msg = f"请为以下单词提供语言学数据：{json.dumps(word_list, ensure_ascii=False)}"
    result = await chat_json(SYSTEM_PROMPT, user_msg, temperature=0.3)
    return result.get("words", result)


async def main(db_path="toefl.db"):
    words = get_words_to_enrich(db_path)
    total = len(words)
    if total == 0:
        print("All words already enriched. Nothing to do.")
        return

    print(f"Found {total} words to enrich in batches of {BATCH_SIZE}")

    all_enriched = {}
    for i in range(0, total, BATCH_SIZE):
        batch = words[i : i + BATCH_SIZE]
        word_list = [w[1] for w in batch]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"  Batch {batch_num}/{total_batches}: {word_list[:3]}... ({len(word_list)} words)")

        retries = 0
        while retries < 3:
            try:
                enriched = await enrich_batch(word_list)
                save_batch(db_path, enriched)
                for w in word_list:
                    if w in enriched:
                        all_enriched[w] = enriched[w]
                print(f"    [OK] Saved {len(enriched)} words")
                break
            except Exception as e:
                retries += 1
                print(f"    [FAIL] Error (attempt {retries}/3): {e}")
                if retries < 3:
                    time.sleep(2 ** retries)

        time.sleep(1)

    backup_path = "data/toefl_vocab_enriched.json"
    try:
        with open(backup_path, "w", encoding="utf-8") as f:
            json.dump(all_enriched, f, ensure_ascii=False, indent=2)
        print(f"\nBackup saved to {backup_path} ({len(all_enriched)} words)")
    except Exception as e:
        print(f"Warning: could not save backup: {e}")

    print(f"\nDone. Enriched {len(all_enriched)}/{total} words.")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "toefl.db"
    asyncio.run(main(path))
