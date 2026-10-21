import { useCallback, useEffect, useRef, useState } from "react";

/* Speech-to-text with the browser's built-in Web Speech API (Chrome, Edge, Safari).
   Nothing is recorded or stored by Product Reps; the browser's speech service turns
   speech into text and we append that text to the answer. */
const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const voiceSupported = !!SR;

// Words people often use as fillers. "like" and "actually" can be real words, so the UI says "possible".
const FILLERS = /\b(um+|uh+|erm+|hmm+|like|basically|actually|literally|you know|kind of|sort of|i mean)\b/gi;

export function countFillers(text) {
  const out = {};
  for (const m of text.toLowerCase().matchAll(FILLERS)) {
    const k = m[1].replace(/^(u)m+$/, "um").replace(/^(u)h+$/, "uh").replace(/^erm+$/, "erm").replace(/^hmm+$/, "hmm");
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

const ERRORS = {
  "not-allowed": "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.",
  "service-not-allowed": "Your browser's speech service is turned off. Try Chrome or Edge, or type your answer.",
  "audio-capture": "No microphone found. Plug one in or check your system sound settings.",
  network: "Speech-to-text needs an internet connection. Check it and try again.",
  "language-not-supported": "Your browser can't transcribe this language. Try Chrome or Edge.",
};

/**
 * onText(chunk): called with each finished piece of speech.
 * Returns { listening, interim, error, elapsed (s, this round), stats, start, stop }.
 * stats covers every round for the current question: { seconds, words, fillers: {um: 2, ...} }.
 */
export function useVoice(onText) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState({ seconds: 0, words: 0, fillers: {} });
  const rec = useRef(null);
  const want = useRef(false);
  const startedAt = useRef(0);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    if (!listening) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [listening]);

  const finishRound = useCallback(() => {
    if (!startedAt.current) return;
    const secs = (Date.now() - startedAt.current) / 1000;
    startedAt.current = 0;
    setStats((s) => ({ ...s, seconds: s.seconds + secs }));
  }, []);

  const begin = useCallback(() => {
    const r = new SR();
    const lang = (navigator.language || "").toLowerCase().startsWith("en") ? navigator.language : "en-IN";
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0].transcript.trim();
        if (!text) continue;
        if (res.isFinal) {
          onTextRef.current(text);
          const f = countFillers(text);
          const n = (text.match(/\S+/g) || []).length;
          setStats((s) => {
            const fillers = { ...s.fillers };
            for (const [k, v] of Object.entries(f)) fillers[k] = (fillers[k] || 0) + v;
            return { ...s, words: s.words + n, fillers };
          });
        } else live += (live ? " " : "") + text;
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return; // the browser restarts below
      want.current = false;
      setError(ERRORS[e.error] || "Voice input stopped unexpectedly. Try again, or type your answer.");
    };
    r.onend = () => {
      setInterim("");
      // Browsers stop listening after a pause; keep going until the person presses Stop.
      if (want.current) {
        setTimeout(() => { if (want.current) { try { r.start(); return; } catch { /* fall through */ } want.current = false; setListening(false); finishRound(); } }, 200);
        return;
      }
      setListening(false);
      finishRound();
    };
    rec.current = r;
    r.start();
  }, [finishRound]);

  const start = useCallback(() => {
    if (!SR || want.current) return;
    setError("");
    want.current = true;
    startedAt.current = Date.now();
    setElapsed(0);
    setListening(true);
    try { begin(); } catch { want.current = false; setListening(false); startedAt.current = 0; setError("Couldn't start the microphone. Try again."); }
  }, [begin]);

  const stop = useCallback(() => {
    want.current = false;
    try { rec.current?.stop(); } catch { /* already stopped */ }
  }, []);

  // Leaving the question (or the page) stops listening.
  useEffect(() => () => { want.current = false; try { rec.current?.abort(); } catch { /* ignore */ } }, []);

  return { listening, interim, error, elapsed, stats, start, stop };
}
