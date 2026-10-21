import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { LIBRARY, CATS, dailyIdFor } from "./data.js";

/* ── Supabase client (null until the env vars are set) ── */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;

/* ── Local progress (this browser) ── */
const KEY = "productreps.v1";
const base = () => ({ attempts: [], drafts: {}, fb: {}, checks: {}, custom: [], read: {} });
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = { ...base(), ...JSON.parse(raw) };
      if (!Array.isArray(s.custom)) s.custom = [];
      if (!Array.isArray(s.attempts)) s.attempts = [];
      if (!s.read || typeof s.read !== "object") s.read = {};
      return s;
    }
  } catch {}
  return base();
}
export function useStore() {
  const [s, setS] = useState(load);
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }, 250);
    return () => clearTimeout(t);
  }, [s]);
  const update = useCallback((fn) => setS((prev) => { const next = structuredClone(prev); fn(next); return next; }), []);
  return [s, update];
}

/* ── Small helpers ── */
export const dayStr = (d = new Date()) => {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
export function dailyId() {
  return dailyIdFor(dayStr());
}
export function streak(attempts) {
  const days = new Set(attempts.map((a) => a.date));
  const d = new Date();
  if (!days.has(dayStr(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayStr(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function latestScores(attempts) {
  const m = {};
  attempts.forEach((a) => { if (typeof a.score === "number") m[a.id] = a.score; });
  return m;
}
export function pickDifficulty(attempts, c) {
  const sc = attempts.filter((a) => a.c === c && typeof a.score === "number").slice(-5).map((a) => a.score);
  if (!sc.length) return "Medium";
  const avg = sc.reduce((s, x) => s + x, 0) / sc.length;
  return avg >= 7.5 ? "Hard" : avg >= 5 ? "Medium" : "Easy";
}
export function ago(ts) {
  if (!ts) return "";
  const t = typeof ts === "string" ? Date.parse(ts) : ts;
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const d = Math.floor(hrs / 24);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
export const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const words = (s) => (s.trim().match(/\S+/g) || []).length;

/* Community row from question_feed → app question shape */
export function fromFeed(r) {
  const c = CATS[r.category] ? r.category : "product";
  return {
    id: "cm-" + r.id, dbId: r.id, source: "community", c, d: r.difficulty, m: r.minutes || CATS[c].mins,
    q: r.body, at: r.asked_at || "", authorId: r.author_id, authorName: r.author_name, authorAvatar: r.author_avatar,
    votes: r.votes || 0, answers: r.answer_count || 0, comments: r.comment_count || 0, created: r.created_at, hidden: r.hidden,
  };
}

/* ── AI calls go through our own server function ── */
export async function callAI(session, body) {
  if (!session) throw { code: "signin", message: "Sign in with Google to use AI features." };
  let r;
  try {
    r = await fetch("/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + session.access_token },
      body: JSON.stringify(body),
    });
  } catch {
    throw { code: "network", message: "Couldn't reach the server. Check your connection and try again." };
  }
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) throw { code: data.code || "error", message: data.error || "AI didn't respond. Try again in a moment." };
  return data;
}

export function dbError(e) {
  const msg = (e && (e.message || e.details)) || "";
  if (/row-level security|permission denied/i.test(msg)) return "You don't have permission to do that.";
  if (/check constraint/i.test(msg)) return "That's too short or too long. Adjust it and try again.";
  if (/duplicate key/i.test(msg)) return "You've already done that.";
  if (/JWT|session/i.test(msg)) return "Your sign-in expired. Sign in again.";
  return "That didn't save. Try again.";
}
