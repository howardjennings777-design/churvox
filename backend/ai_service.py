import os


def ai_configured() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY", "").strip())


def generate_ai_text(system_prompt: str, user_prompt: str, fallback: str, max_tokens: int = 500) -> dict:
    """Safe Churvox AI helper. Falls back cleanly if AI is not configured or unavailable."""
    if not ai_configured():
        return {
            "configured": False,
            "used_ai": False,
            "text": fallback,
            "message": "AI Assistant is not configured yet. Add OPENAI_API_KEY in Render to enable generated answers.",
        }

    try:
        from openai import OpenAI

        client = OpenAI()
        result = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.35,
            max_tokens=max_tokens,
        )
        text = (result.choices[0].message.content or "").strip()
        return {
            "configured": True,
            "used_ai": bool(text),
            "text": text or fallback,
            "message": "AI generated successfully." if text else "AI returned an empty response; fallback used.",
        }
    except Exception as exc:
        return {
            "configured": True,
            "used_ai": False,
            "text": fallback,
            "message": f"AI provider unavailable; fallback used. {exc}",
        }
