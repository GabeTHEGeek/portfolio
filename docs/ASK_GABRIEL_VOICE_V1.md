# Ask Gabriel Voice V1

Voice is a thin browser layer around the existing Ask Gabriel request path:
browser microphone (Web Speech API) → the existing `ask-gabriel` retrieval and DeepSeek answer → browser speech synthesis. There is one answer model and the existing source links remain visible in the transcript.

## Setup

The browser asks for microphone permission when **Talk to Gabriel** is started. OpenAI TTS supplies the natural spoken reply through a server-only endpoint; browser speech synthesis remains the automatic fallback. The voice provider never writes the answer: the existing grounded Ask Gabriel response is converted to audio unchanged.

Set `OPENAI_API_KEY` on the server. Optional settings are `OPENAI_TTS_MODEL` (default `gpt-4o-mini-tts`) and `OPENAI_TTS_VOICE` (default `cedar`). Never expose these values in browser code.

For an approved custom voice, set `OPENAI_TTS_VOICE_ID` to the returned `voice_...` ID. It takes precedence over the named voice. Custom voice creation requires OpenAI custom-voice access plus matching consent and sample recordings. Ask Gabriel speaks about Gabriel’s published work in first person, while always identifying itself honestly as his AI digital counterpart when asked.

Optional public settings (seconds): `PUBLIC_ASK_GABRIEL_VOICE_MAX_SESSION_SECONDS` (default 300) and `PUBLIC_ASK_GABRIEL_VOICE_IDLE_TIMEOUT_SECONDS` (default 45). These are not secrets. Keep DeepSeek and Supabase keys server-side. The existing server rate limit (10 requests/minute per client) applies to voice requests too.

Voice answers strip URLs and markdown before playback, while links remain clickable on screen. Sessions are not recorded or stored. The disclosure is shown once per browser session.

## Manual test plan

Open Ask Gabriel, select **Talk to Gabriel**, grant microphone access, and ask:

- “What is Ask Gabriel, and how does it work?”
- “What projects has Gabriel built with AI agents?”
- “What does Gabriel do when there is insufficient evidence?”

Verify listening, thinking, speaking, stop/interruption, timer, live transcript, final text/source links, and the insufficient-evidence answer. Refresh and confirm the disclosure appears only once in the same session.

## Checks

Run `npm run test:voice`, the existing retrieval tests, and `npm run build`.
