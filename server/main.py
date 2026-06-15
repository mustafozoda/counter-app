"""Counter Assistant — FastAPI proxy for the in-app AI chat bot.

The app never sees the OpenAI key: it talks to this service, which holds the
key server-side and streams the model's reply back token-by-token over SSE.

Run (dev):
    cd server
    python -m venv .venv && source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
    pip install -r requirements.txt
    cp .env.example .env   # then put your real OPENAI_API_KEY in .env
    uvicorn main:app --host 0.0.0.0 --port 8787 --reload
"""

from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

load_dotenv()

DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
# Comma-separated list, or "*" for any origin (fine for local dev).
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

# Supabase auth: when both are set, /chat requires a valid Supabase access token
# so only signed-in app users can reach the model. Leave unset for open dev.
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
REQUIRE_AUTH = bool(SUPABASE_URL and SUPABASE_ANON_KEY)


async def require_user(authorization: str | None = Header(default=None)) -> dict | None:
    """Validate the caller's Supabase access token via the Auth API.

    No network round-trip in dev: when SUPABASE_URL/ANON_KEY are unset, auth is
    disabled and every request is allowed.
    """
    if not REQUIRE_AUTH:
        return None
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Auth check failed") from exc
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return resp.json()

SYSTEM_PROMPT = (
    "You are Counter Assistant, a friendly and concise AI helper living inside "
    "the Counter mobile app. Answer clearly and helpfully. Use Markdown "
    "(short paragraphs, **bold**, `code`, bullet lists, fenced code blocks) "
    "when it makes the answer easier to read."
)

# Reads OPENAI_API_KEY from the environment automatically.
client = AsyncOpenAI()

app = FastAPI(title="Counter Assistant API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str = Field(pattern="^(system|user|assistant)$")
    # Plain text, or OpenAI-style multimodal content parts (text + image_url)
    # so the app can send images to a vision-capable model (e.g. gpt-4o-mini).
    content: str | list[dict[str, Any]]


class ChatRequest(BaseModel):
    messages: list[Message]
    model: str | None = None


def _sse(payload: dict) -> str:
    """Format a dict as a Server-Sent Events `data:` frame."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "model": DEFAULT_MODEL}


@app.post("/chat")
async def chat(req: ChatRequest, _user: dict | None = Depends(require_user)) -> StreamingResponse:
    """Stream a chat completion back to the app as SSE.

    Each frame is `data: {"delta": "..."}`; the stream ends with
    `data: [DONE]`. Errors arrive as `data: {"error": "..."}` so the client
    can show a clean message instead of a dropped connection.
    """

    model = req.model or DEFAULT_MODEL
    history = [{"role": "system", "content": SYSTEM_PROMPT}]
    history += [m.model_dump() for m in req.messages]

    async def event_stream() -> AsyncIterator[str]:
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=history,
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield _sse({"delta": delta})
        except Exception as exc:  # noqa: BLE001 — surface any failure to the client
            yield _sse({"error": str(exc)})
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8787")),
        reload=True,
    )
