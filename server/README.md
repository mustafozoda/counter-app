# Counter Assistant API

A tiny FastAPI service that proxies the in-app AI chat bot to OpenAI. The app
talks to this server so your `OPENAI_API_KEY` stays on the backend and never
ships inside the mobile bundle.

## Endpoints

| Method | Path      | Description                                            |
| ------ | --------- | ------------------------------------------------------ |
| GET    | `/health` | Liveness check; returns the active model.              |
| POST   | `/chat`   | Streams a chat completion back as SSE (`text/event-stream`). |

`POST /chat` body:

```json
{ "messages": [{ "role": "user", "content": "Hello!" }] }
```

The response streams frames like `data: {"delta": "Hi"}`, ending with
`data: [DONE]`. Errors come back as `data: {"error": "..."}`.

## Run locally

```bash
cd server
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # then paste your real OPENAI_API_KEY into .env
uvicorn main:app --host 0.0.0.0 --port 8787 --reload
```

Verify it's up:

```bash
curl http://localhost:8787/health
```

## Connecting the app

The Expo app reads the API base URL from `EXPO_PUBLIC_CHAT_API_URL`
(see `client/.env.example`).

- **iOS simulator / web:** `http://localhost:8787` works.
- **Android emulator:** use `http://10.0.2.2:8787`.
- **Physical phone:** use your computer's LAN IP, e.g. `http://192.168.1.20:8787`
  (run the server with `--host 0.0.0.0` and keep the phone on the same Wi-Fi).
