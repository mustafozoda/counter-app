/**
 * Base URL of the Counter Assistant backend (the FastAPI service in /server).
 *
 * Set EXPO_PUBLIC_CHAT_API_URL in client/.env to point at your machine:
 *   • iOS simulator / web  → http://localhost:8787
 *   • Android emulator      → http://10.0.2.2:8787
 *   • Physical phone        → http://<your-LAN-ip>:8787
 */
const FALLBACK_URL = 'http://localhost:8787';

export const CHAT_API_URL = (process.env.EXPO_PUBLIC_CHAT_API_URL ?? FALLBACK_URL).replace(
  /\/+$/,
  '',
);
