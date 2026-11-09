import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import database
from gemini import ask_gemini, stream_speech

app = FastAPI(title="Retailer Voice Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA = json.loads((Path(__file__).parent / "data.json").read_text(encoding="utf-8"))
RETAILERS = DATA["retailers"]
PRODUCTS = DATA["products"]

database.init_db()


class Message(BaseModel):
    role: str  # "user" (retailer) or "agent"
    text: str


class ChatRequest(BaseModel):
    retailer_id: str
    messages: list[Message]


def find_retailer(retailer_id):
    for retailer in RETAILERS:
        if retailer["id"] == retailer_id:
            return retailer
    raise HTTPException(status_code=404, detail="Retailer not found")


def to_gemini_format(messages):
    contents = []
    for m in messages:
        role = "model" if m.role == "agent" else "user"
        if not contents and role == "model":
            continue  # opening greeting, Gemini wants the first turn to be the user's
        contents.append({"role": role, "parts": [{"text": m.text}]})
    return contents


def build_system_prompt(retailer):
    return f"""You are Priya, a sales support executive at Marico. You are on a phone call with a retailer.

Retailer: {retailer['owner']} from {retailer['name']}, {retailer['city']}.
Last order: {retailer['last_order']}.

Product list (only quote prices, schemes and stock from this list):
{json.dumps(PRODUCTS)}

Guidelines:
- Reply in one or two short sentences, the way you would on a phone call.
- Plain, friendly English. If the retailer talks in Hindi or Hinglish, reply in the same way.
- If a product is not in the list, or you are unsure, say you will check and call back.
- If stock is 0, say it is out of stock at the moment.
- Do not offer any discount that is not in the list.
- Try to find out which products they want, how many cases, and if they need a follow-up (callback, visit, samples).
- No bullet points, markdown or emojis. Your reply will be read out loud."""


@app.get("/api/retailers")
def get_retailers():
    return RETAILERS


@app.get("/api/products")
def get_products():
    return PRODUCTS


@app.post("/api/chat")
def chat(req: ChatRequest):
    retailer = find_retailer(req.retailer_id)
    try:
        reply = ask_gemini(to_gemini_format(req.messages), system=build_system_prompt(retailer))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"reply": reply}


class SpeechRequest(BaseModel):
    text: str


@app.post("/api/speech")
def speech(req: SpeechRequest):
    try:
        audio = stream_speech(req.text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    # raw PCM audio, 16-bit 24kHz mono, sent while it is still being generated
    return StreamingResponse(audio, media_type="application/octet-stream")


@app.post("/api/calls")
def end_call(req: ChatRequest):
    """Summarise the conversation and save it."""
    retailer = find_retailer(req.retailer_id)
    if not any(m.role == "user" for m in req.messages):
        raise HTTPException(status_code=400, detail="Nothing to summarise yet")

    transcript = "\n".join(
        f"{'Agent' if m.role == 'agent' else 'Retailer'}: {m.text}" for m in req.messages
    )
    prompt = f"""Below is a call between a Marico sales executive and a retailer.
Return JSON with these keys:
  "summary": 2-3 sentence summary of the call
  "products": list of {{"name": string, "quantity_cases": number or null}} for products the retailer showed interest in
  "follow_up": what follow-up is needed, or "None"
  "outcome": one of "Order enquiry", "Follow-up needed", "Not interested", "Information only"

Transcript:
{transcript}"""

    try:
        text = ask_gemini([{"role": "user", "parts": [{"text": prompt}]}], as_json=True)
        result = json.loads(text)
    except Exception as e:
        # still save the call so the conversation is not lost
        print("Summary failed:", e)
        result = {
            "summary": "Summary could not be generated. See the transcript.",
            "products": [],
            "follow_up": "None",
            "outcome": "Information only",
        }

    transcript_list = [m.model_dump() for m in req.messages]
    return database.save_call(retailer, transcript_list, result)


@app.get("/api/calls")
def get_calls():
    return database.list_calls()


@app.get("/api/calls/{call_id}")
def get_call(call_id: int):
    call = database.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call
