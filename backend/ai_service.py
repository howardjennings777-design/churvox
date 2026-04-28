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
            "message": "AI Assistant is not configured yet. Add OPENAI_API_KEY in Render backend Environment, then save/redeploy.",
            "error_type": "missing_openai_api_key",
        }

    try:
        from openai import OpenAI

        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", "").strip())
        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
        result = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.25,
            max_tokens=max_tokens,
        )
        text = (result.choices[0].message.content or "").strip()
        return {
            "configured": True,
            "used_ai": bool(text),
            "text": text or fallback,
            "message": "AI generated successfully." if text else "AI returned an empty response; fallback used.",
            "model": model,
            "error_type": None if text else "empty_ai_response",
        }
    except Exception as exc:
        raw = str(exc)
        lower = raw.lower()
        if "insufficient_quota" in lower or "quota" in lower or "billing" in lower or "credit" in lower:
            error_type = "openai_billing_or_quota"
        elif "invalid_api_key" in lower or "incorrect api key" in lower or "authentication" in lower or "401" in lower:
            error_type = "invalid_openai_api_key"
        elif "model" in lower and ("not found" in lower or "does not exist" in lower or "access" in lower):
            error_type = "model_not_available"
        else:
            error_type = "openai_provider_error"
        return {
            "configured": True,
            "used_ai": False,
            "text": fallback,
            "message": f"AI provider unavailable; fallback used. {raw[:280]}",
            "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            "error_type": error_type,
        }
