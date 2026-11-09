# Retailer Call Assistant

A prototype voice assistant for FMCG retailer calls. A sales executive picks a retailer, talks (or types) to the assistant, and gets answers on prices, schemes and stock. When the call ends, a summary with product interest, quantities and follow-up is generated and saved. Earlier calls can be reviewed in the history tab.

**Stack:** React (Vite) + Ant Design, FastAPI, SQLite, Gemini API, browser Web Speech API.

## Setup

You need Python 3.10+ and Node.js 18+.

**Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # Mac/Linux: cp .env.example .env
```

Put your Gemini API key in `backend/.env` (free key: https://aistudio.google.com/apikey), then:

```bash
uvicorn main:app --reload --port 8000
```

**Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in Chrome or Edge.

## How to use

1. **New Call**: choose a retailer and start the call.
2. Tap the mic and speak, or type a message. The assistant answers and reads the reply aloud (can be switched off). The "Try asking" buttons send sample questions.
3. **End call** creates the summary and saves it.
4. **Call History** lists past calls. Click a row to see the summary and full transcript.
5. **Products** shows the sample catalogue and retailers the assistant works from.

## Project structure

```
backend/
  main.py          API routes and the prompt
  gemini.py        Gemini API call
  database.py      SQLite storage for finished calls
  data.json        Sample retailers, products, prices, schemes, stock
frontend/src/
  App.jsx          Layout and tabs
  api.js           Calls to the backend
  useSpeech.js     Speech recognition and speech output
  pages/           NewCall, Products, History
  components/      Transcript (chat bubbles), CallSummary
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/retailers` | Mock retailer records |
| GET | `/api/products` | Product catalogue |
| POST | `/api/chat` | Send the conversation so far, get the agent's next reply |
| POST | `/api/speech` | Convert reply text to spoken audio (streamed PCM) |
| POST | `/api/calls` | End the call: generate summary, save it |
| GET | `/api/calls` | List saved calls |
| GET | `/api/calls/{id}` | One saved call |

## Technical approach

- **Voice in:** the browser's built-in speech recognition. If the browser does not support it (e.g. Firefox), the mic is hidden and the text box works the same way.
- **Voice out:** each reply is converted to natural-sounding speech by Gemini TTS. The backend streams the audio (`POST /api/speech`, raw 16-bit 24kHz PCM) and the browser plays it with the Web Audio API while it is still arriving, so the voice starts in about 1-2 seconds instead of waiting for the full clip. If the Gemini voice fails, the browser's built-in voice is used. The model and voice can be changed in `backend/.env` with `GEMINI_TTS_MODEL` and `GEMINI_TTS_VOICE` (default `gemini-3.8-flash-tts`, voice `Kore`).
- **Answers:** the product list (prices, schemes, stock) is small, so it is sent with every request in the system prompt, and the assistant is told to quote only from it. The retailer's name and last order are included too.
- **Replies are short** and written without markdown because they are read out loud.
- **Summary:** at the end, the transcript is sent to Gemini once with JSON output enabled. It returns summary, products with quantities, follow-up and outcome, which are stored in SQLite along with the transcript.
- **API key** stays in the backend `.env` and is never exposed to the browser.

## Assumptions

- Retailers, products, prices and schemes are made up.
- No login; one user.
- The whole conversation is sent to Gemini on each turn. Fine for short calls.
- Speech recognition is set to `en-IN`. Hindi/Hinglish typed text works, spoken Hindi would need the language switched.

## Ideas for later

- Function calling for stock lookup and order capture instead of a prompt-only catalogue
- Hindi and other regional languages for voice
- Editable product data and retailer management
- Deployment with a hosted database
