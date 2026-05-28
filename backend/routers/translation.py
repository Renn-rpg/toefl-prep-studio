from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from deepseek_client import chat_json

router = APIRouter()


class GenerateRequest(BaseModel):
    mode: str = Field(..., description="cn_to_en or en_to_cn")
    difficulty: str = Field(default="medium", description="easy / medium / hard")
    topic: Optional[str] = None
    count: int = Field(default=5, ge=1, le=10)


class CheckRequest(BaseModel):
    sentences: list[dict]
    user_answers: list[dict]


@router.post("/generate")
async def generate_translation(req: GenerateRequest):
    if req.mode not in ("cn_to_en", "en_to_cn"):
        raise HTTPException(status_code=400, detail="mode must be cn_to_en or en_to_cn")
    if req.difficulty not in ("easy", "medium", "hard"):
        raise HTTPException(status_code=400, detail="difficulty must be easy, medium, or hard")

    topic_hint = f"关于「{req.topic}」" if req.topic else "通用话题"

    if req.mode == "cn_to_en":
        system = """你是一位专业的英语教学专家。请生成中译英练习题。

返回格式（仅返回 JSON）：
{
  "sentences": [
    {
      "chinese": "中文句子",
      "english": "对应的英文翻译",
      "blanks": [
        {"position": "英文原句中需要挖空的单词或短语", "hint": "词性提示，如 v./n./adj./adv./短语"}
      ]
    }
  ]
}

要求：
- 每句随机挖 2 到 3 个空，绝对不能全句只有 1 个空
- 每个空必须是单个单词，绝对不能挖整个短语
- blanks 中的 position 必须是在 english 字段中精确匹配的子串（单个单词）
- 简单模式用基础词汇和短句，困难模式用高级词汇和复合句
- 提示用中文，如"动词""名词""形容词\""""
    else:
        system = """你是一位专业的英语教学专家。请生成英译中练习题。

返回格式（仅返回 JSON）：
{
  "sentences": [
    {
      "english": "英文句子",
      "chinese": "对应的中文翻译",
      "blanks": [
        {"position": "中文译文中需要挖空的词或短语", "hint": "词性提示，如 动词/名词/形容词/成语"}
      ]
    }
  ]
}

要求：
- 每句随机挖 2 到 3 个空，绝对不能全句只有 1 个空
- 每个空必须是单个词，绝对不能挖整个短语
- blanks 中的 position 必须是在 chinese 字段中精确匹配的子串（单个词）
- 简单模式用基础词汇和短句，困难模式用高级词汇和复合句
- 提示用中文，如"动词""名词""成语\""""

    user = f"""生成 {req.count} 道难度为{req.difficulty}的{'中译英' if req.mode == 'cn_to_en' else '英译中'}练习题。
话题：{topic_hint}"""

    result = await chat_json(system, user, temperature=0.7)
    return result


@router.post("/check")
def check_answers(req: CheckRequest):
    """Check user answers against the correct blanks."""
    results = []
    total_correct = 0
    total_blanks = 0

    for s in req.sentences:
        blanks = s.get("blanks", [])
        target_text = s.get("english" if "english" in s else "chinese", "")
        sentence_results = []

        for blank in blanks:
            pos = blank["position"]
            user_answer = None
            for ua in req.user_answers:
                if ua.get("position") == pos:
                    user_answer = ua.get("answer", "").strip()
                    break

            is_correct = False
            if user_answer:
                correct_lower = pos.strip().lower()
                answer_lower = user_answer.lower()
                is_correct = answer_lower == correct_lower

            sentence_results.append({
                "position": pos,
                "hint": blank.get("hint", ""),
                "correct_answer": pos,
                "user_answer": user_answer or "",
                "is_correct": is_correct,
            })
            total_blanks += 1
            if is_correct:
                total_correct += 1

        results.append({
            "target": target_text,
            "blanks": sentence_results,
        })

    return {
        "score": total_correct,
        "total": total_blanks,
        "results": results,
    }
