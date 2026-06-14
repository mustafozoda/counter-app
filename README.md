# Counter

A monorepo with two parts:

| Folder | What it is |
| ------ | ---------- |
| **`client/`** | The Counter mobile app (Expo + React Native) — retail tools **and** an AI chat assistant. |
| **`server/`** | A FastAPI service that powers the AI chat (keeps your OpenAI key, streams replies). |

The app works on its own. The **server is only needed for the AI chat** (the ✨ button on Home, or More → Chat with AI).

---

## 1. Run the server

```bash
cd server
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # then paste your OPENAI_API_KEY into .env
uvicorn main:app --host 0.0.0.0 --port 8787 --reload
```

Test it: open `http://localhost:8787/health` → `{"ok":true,...}`.

## 2. Connect the app to the server

Find your computer's LAN IP (`ipconfig` on Windows), then:

```bash
cd client
cp .env.example .env.local
# edit .env.local:
#   EXPO_PUBLIC_CHAT_API_URL=http://<your-computer-IP>:8787
```

The phone must be on the **same Wi-Fi** as your computer. If your IP changes,
update `.env.local` and rebuild/restart.

## 3. Run the app

```bash
cd client
npm install
```

**Develop** (build the app onto your phone/emulator, then live-reload):

```bash
npx expo run:android              # first time, and after adding native deps
npx expo start --dev-client       # every day after — just reloads your code
```

> Plug the phone in via USB (with USB debugging on) or use an emulator the
> first time so `run:android` can install. After that, `expo start` connects
> over Wi-Fi.

**Build the real, standalone app** (an APK you install like any normal app):

```bash
npx expo run:android --variant release
```

The installable file lands at:

```
client/android/app/build/outputs/apk/release/app-release.apk
```

---

## How the AI chat works

```
App  ──POST /chat──▶  server (FastAPI)  ──▶  OpenAI
     ◀── streamed ──   keeps the API key,    streams
        tokens         streams the reply     tokens back
```

- The app talks only to **your server** — the OpenAI key never ships in the app.
- Replies **stream in token by token**.
- Conversations are saved **on the phone** (multiple chats); nothing chat-related is stored on the server.

For more detail see [`client/README.md`](client/README.md) and [`server/README.md`](server/README.md).
