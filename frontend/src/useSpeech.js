import { useEffect, useRef, useState } from "react";
import { api } from "./api";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const SAMPLE_RATE = 24000; // Gemini TTS audio: 16-bit PCM, 24kHz, mono
const FLUSH_BYTES = 12000; // about 0.25 seconds of audio, avoids choppy playback

// Voice in (speech recognition) and voice out (streamed Gemini TTS).
// onResult is called with the recognised text.
// voiceState is "idle", "preparing" (waiting for first audio) or "speaking".
export function useSpeech(onResult) {
  const [listening, setListening] = useState(false);
  const [voiceState, setVoiceState] = useState("idle");
  const recognitionRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourcesRef = useRef([]);
  const requestId = useRef(0);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (event) => onResultRef.current(event.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  function startListening() {
    stopSpeaking();
    recognitionRef.current.start();
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current.stop();
  }

  // Plays the audio while it is still downloading. If the Gemini voice is not
  // available, the browser's own voice is used instead.
  async function speak(text) {
    stopSpeaking();
    const id = ++requestId.current;
    setVoiceState("preparing");

    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      const ctx = audioCtxRef.current;
      await ctx.resume();

      const response = await api.speech(text);
      const reader = response.body.getReader();

      let pending = new Uint8Array(0);
      let nextStart = ctx.currentTime + 0.05;
      let started = false;

      function playPending() {
        const samples = Math.floor(pending.length / 2);
        if (samples === 0) return;
        const view = new DataView(pending.buffer, pending.byteOffset, samples * 2);
        const buffer = ctx.createBuffer(1, samples, SAMPLE_RATE);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < samples; i++) channel[i] = view.getInt16(i * 2, true) / 32768;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        nextStart = Math.max(nextStart, ctx.currentTime);
        source.start(nextStart);
        nextStart += buffer.duration;
        sourcesRef.current.push(source);
        pending = pending.slice(samples * 2); // keep a leftover odd byte

        if (!started) {
          started = true;
          setVoiceState("speaking");
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (id !== requestId.current) {
          reader.cancel();
          return; // stopped or replaced by a newer reply
        }
        if (done) break;
        const joined = new Uint8Array(pending.length + value.length);
        joined.set(pending);
        joined.set(value, pending.length);
        pending = joined;
        if (pending.length >= FLUSH_BYTES) playPending();
      }
      playPending();

      if (!started) throw new Error("No audio received");

      // go back to idle when the last piece has finished playing
      const last = sourcesRef.current[sourcesRef.current.length - 1];
      last.onended = () => {
        if (id === requestId.current) setVoiceState("idle");
      };
    } catch (err) {
      if (id !== requestId.current) return;
      speakWithBrowser(text, id);
    }
  }

  function speakWithBrowser(text, id) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.onstart = () => setVoiceState("speaking");
    utterance.onend = () => {
      if (id === requestId.current) setVoiceState("idle");
    };
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    requestId.current++;
    window.speechSynthesis.cancel();
    sourcesRef.current.forEach((source) => {
      source.onended = null;
      try {
        source.stop();
      } catch (e) {
        // already finished
      }
    });
    sourcesRef.current = [];
    setVoiceState("idle");
  }

  return {
    supported: Boolean(SpeechRecognition),
    listening,
    voiceState,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
