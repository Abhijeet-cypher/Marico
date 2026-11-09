import base64
import json
import os

import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

TTS_MODEL = os.getenv("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")
TTS_VOICE = os.getenv("GEMINI_TTS_VOICE", "Kore")


def ask_gemini(contents, system=None, as_json=False):
    """Send a conversation to Gemini and return the reply text."""
    body = {
        "contents": contents,
        # no extra thinking time, keeps replies quick for a voice call
        "generationConfig": {"thinkingConfig": {"thinkingBudget": 0}},
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    if as_json:
        body["generationConfig"]["responseMimeType"] = "application/json"

    response = requests.post(URL, params={"key": API_KEY}, json=body, timeout=30)
    data = response.json()
    if response.status_code != 200:
        raise RuntimeError(data.get("error", {}).get("message", "Gemini request failed"))

    parts = data["candidates"][0]["content"]["parts"]
    return "".join(part.get("text", "") for part in parts).strip()


def stream_speech(text):
    """Convert text to speech with Gemini TTS.

    Returns a generator of raw audio bytes (16-bit PCM, 24kHz, mono). The audio is
    streamed so the browser can start playing after about a second instead of
    waiting for the whole reply to be generated.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{TTS_MODEL}:streamGenerateContent"
    body = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": TTS_VOICE}}},
        },
    }
    response = requests.post(
        url, params={"key": API_KEY, "alt": "sse"}, json=body, stream=True, timeout=60
    )
    # check for errors now, before the streaming response to the browser has started
    if response.status_code != 200:
        message = response.json().get("error", {}).get("message", "Text to speech failed")
        raise RuntimeError(message)

    def audio_chunks():
        for line in response.iter_lines():
            if not line.startswith(b"data:"):
                continue
            event = json.loads(line[5:])
            for part in event["candidates"][0]["content"]["parts"]:
                if "inlineData" in part:
                    yield base64.b64decode(part["inlineData"]["data"])

    return audio_chunks()
