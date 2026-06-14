# Counter — monorepo

Two halves in one repo:

| Folder      | What it is | Stack |
| ----------- | ---------- | ----- |
| **`client/`** | The **Counter** mobile app — a retail OS for independent shops (inventory, POS, orders, finance, installments, storefront) **plus an in-app AI chat assistant**. | Expo SDK 54 · React Native · TypeScript · Expo Router · NativeWind · Zustand · TanStack Query |
| **`server/`** | A small **FastAPI** service that powers the AI chat. It holds the OpenAI key server-side and streams replies to the app. | Python · FastAPI · Uvicorn · OpenAI SDK |

> The app and the chat backend are independent: the retail features work without the server. The server is only needed for the **AI Assistant** screen.

---

## Prerequisites

- **Node.js** 18+ and **npm** (for the app)
- **Python** 3.10+ (for the server)
- An **OpenAI API key** (for the chat)
- A phone with **Expo Go**, or an Android/iOS emulator. For the AI chat you need a
  **development build** (Expo Go can't load the native keyboard module) — see
  [Dev build](#dev-build) below.

---

## Run it (both sides)

The chat needs **both** running. The app and the server talk over your local
network, so they must be on the **same Wi-Fi**.

### 1. Start the server (`server/`)

```bash
cd server
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                  # then put your real OPENAI_API_KEY in .env
uvicorn main:app --host 0.0.0.0 --port 8787 --reload
```

Check it: open `http://localhost:8787/health` → `{"ok":true,"model":"gpt-4o-mini"}`.

> `--host 0.0.0.0` is required so your phone (a different device) can reach it.

### 2. Point the app at the server (`client/`)

Find your computer's **LAN IP** (`ipconfig` on Windows, `ipconfig getifaddr en0`
on macOS), then:

```bash
cd client
cp .env.example .env.local
# edit .env.local:
#   EXPO_PUBLIC_CHAT_API_URL=http://<your-computer-LAN-ip>:8787
```

Address cheat-sheet:
- iOS simulator / web → `http://localhost:8787`
- Android emulator → `http://10.0.2.2:8787`
- Physical phone → `http://<your-LAN-ip>:8787` (same Wi-Fi)

> `EXPO_PUBLIC_*` values are baked in when the bundle builds — after editing
> `.env.local`, restart Metro with a cleared cache: `npx expo start -c`.

### 3. Start the app (`client/`)

```bash
cd client
npm install
npx expo start          # then press a / i, or open your dev build
```

The retail features run anywhere. For the **AI Assistant** (the ✨ button on the
Home header, or **More → Chat with AI**), the server from step 1 must be running
and reachable at the URL from step 2.

---

## Dev build

The chat uses `react-native-keyboard-controller`, a **native module that isn't in
Expo Go**, so the AI screen needs a development build:

```bash
cd client
npx expo run:android    # or: npx expo run:ios   (needs Android Studio / Xcode)
```

This builds and installs a custom dev app. After the first build, your daily loop
is just `npx expo start` — the phone connects over Wi-Fi and hot-reloads JS. You
only rebuild when you add/upgrade a native module.

No Android Studio? Use an EAS cloud build instead (`client/eas.json` has
`development`, `preview`, and `production` profiles):

```bash
cd client
npx eas-cli build --profile development --platform android
```

---

## How the AI chat works

```
 App (client)                         Server (FastAPI)            OpenAI
 ┌───────────────┐   POST /chat       ┌────────────────┐  stream  ┌────────┐
 │ Assistant     │ ─ messages[] ────▶ │ holds API key  │ ───────▶ │ model  │
 │ screen        │                    │ adds system    │          └────────┘
 │               │ ◀── SSE deltas ─── │ prompt, streams │ ◀────────
 │ renders tokens│   data:{"delta"}   │ tokens as SSE   │
 └───────────────┘                    └────────────────┘
```

- The app **never** sees the OpenAI key — it only talks to your server.
- `POST /chat` streams the reply as **Server-Sent Events** (`data: {"delta": "..."}`,
  ending with `data: [DONE]`); the app renders tokens as they arrive.
- Conversations are **stored on-device** (multiple chats, ChatGPT-style) via
  Zustand + AsyncStorage — nothing chat-related is persisted on the server.

Going to production later means **hosting the server** (Render / Railway / Fly.io)
so the app uses a stable `https://…` URL instead of a LAN IP — and adding auth +
rate limiting to the `/chat` endpoint so the key can't be abused.

---

## Project layout

```
counter-app/
├─ client/                 # Expo app  (see client/README.md for the deep dive)
│  ├─ app/                 # Expo Router routes: (auth) (merchant) (storefront)
│  │  └─ (merchant)/assistant.tsx   # AI chat screen
│  └─ src/
│     ├─ features/assistant/        # chat store, streaming client, UI
│     ├─ features/…                 # products, pos, finance, storefront, …
│     ├─ components/ui/             # "Counter DS" primitives
│     ├─ stores/  theme/  lib/  i18n/  api/  types/
│     └─ …
└─ server/                 # FastAPI chat proxy  (see server/README.md)
   ├─ main.py              # /health and streaming /chat
   ├─ requirements.txt
   └─ .env.example         # OPENAI_API_KEY, OPENAI_MODEL, PORT, ALLOWED_ORIGINS
```

## Useful commands

```bash
# client/
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint
npm test              # jest

# server/
uvicorn main:app --host 0.0.0.0 --port 8787 --reload
```

For per-side details see [`client/README.md`](client/README.md) and
[`server/README.md`](server/README.md).
