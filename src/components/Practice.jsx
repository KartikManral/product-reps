import React, { useEffect, useRef, useState } from "react";
import { CATS } from "../data.js";
import { supabase, callAI, words } from "../lib.js";
import { SignInPrompt } from "./ui.jsx";
import Discussion from "./Discussion.jsx";

export default function Practice({ q, S, update, isToday, onLog, session, profile, isAdmin, onSignIn, onNext, onRandom, onGenerate, onPostQuestion, onPosted, reloadFeed }) {
  const c = CATS[q.c];
  const [showHint, setShowHint] = useState(false);
  const [logged, setLogged] = useState(false);
  const [fbState, setFbState] = useState(null);      // {busy|err|signin, text}
  const [gen, setGen] = useState(null);              // {busy|err|ok|signin, text}
  const aiOn = !!supabase;
  const draft = S.drafts[q.id] || "";
  const fb = S.fb[q.id] || null;

  /* timer */
  const total = q.m * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const tick = useRef(null);
  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => setLeft((l) => { if (l <= 1) { setRunning(false); return 0; } return l - 1; }), 1000);
    return () => clearInterval(tick.current);
  }, [running]);
  const mmss = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const timerLabel = running ? "Pause" : left <= 0 ? "Time's up" : left < total ? "Resume" : "Start timer";

  const log = (score) => { if (logged) return; onLog(score); setLogged(true); };

  async function getFeedback() {
    if (!session) { setFbState({ kind: "signin" }); return; }
    if (draft.trim().length < 60) { setFbState({ kind: "err", text: "Write a few more lines first, so there's something to review." }); return; }
    setFbState({ kind: "busy", text: "Reviewing your answer like an interviewer would…" });
    try {
      const r = await callAI(session, { kind: "feedback", category: q.c, question: q.q, answer: draft });
      const { remaining, ...result } = r;
      update((s) => { s.fb[q.id] = result; });
      setFbState(remaining != null && remaining <= 3 ? { kind: "note", text: `${remaining} AI requests left today.` } : null);
      log(result.score);
    } catch (e) {
      setFbState(e.code === "signin" ? { kind: "signin" } : { kind: "err", text: e.message });
    }
  }

  async function newQuestion() {
    if (!session) { setGen({ kind: "signin" }); return; }
    setGen({ kind: "busy", text: "Writing a new question…" });
    try {
      await onGenerate();
      // this component remounts on the new question; nothing else to do
    } catch (e) {
      setGen(e.code === "signin" ? { kind: "signin" } : { kind: "err", text: e.message });
    }
  }

  return (
    <section className="work">
      <div className="sheet">
        <div className="meta">
          {isToday && <span className="tag today">Today's question</span>}
          {q.source === "ai" && <span className="tag src-t">AI-generated</span>}
          {q.source === "community" && <span className="tag src-t">Community</span>}
          {q.hidden && <span className="tag d-Hard">Hidden</span>}
          <span className="tag">{c.label}</span>
          <span className={"tag d-" + q.d}>{q.d}</span>
          <span className="tag">{q.m} min</span>
        </div>
        <h2>{q.q}</h2>
        {q.source === "community" && (
          <div className="asked">{q.at ? `Asked at: ${q.at} · ` : ""}Shared by {q.authorName || "someone"}</div>
        )}
        <div className="row">
          <button className="btn" aria-expanded={showHint} onClick={() => setShowHint(!showHint)}>{showHint ? "Hide framework" : "Show framework"}</button>
          <button className="btn ghost" onClick={onNext}>Next question</button>
          <button className="btn ghost" onClick={onRandom}>Random</button>
          <span className="spacer" />
          {aiOn && <button className="btn" onClick={newQuestion} disabled={gen?.kind === "busy"}>New AI question</button>}
        </div>
        {gen?.kind === "signin" && <SignInPrompt text="Sign in with Google to generate new questions with AI." onSignIn={onSignIn} />}
        {gen && gen.kind !== "signin" && <p className={"msg" + (gen.kind === "err" ? " err" : "")} style={{ margin: 0 }}>{gen.text}</p>}
        {showHint && (
          <div className="hint">
            <h3>{c.fw}</h3>
            <ol>{c.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
        )}
        <div className="row">
          <div className="timer">
            <span className={"clock" + (left <= 0 ? " up" : "")}>{mmss}</span>
            <button className="btn" disabled={left <= 0 && !running} onClick={() => setRunning(!running)}>{timerLabel}</button>
            <button className="btn ghost" onClick={() => { setRunning(false); setLeft(total); }}>Reset</button>
          </div>
        </div>
        <label htmlFor="answer" className="small">Your answer. Think out loud, the way you would in the interview.</label>
        <textarea id="answer" className="answer" placeholder="Start by clarifying the goal…" value={draft}
          onChange={(e) => { const v = e.target.value; update((s) => { s.drafts[q.id] = v; }); }} />
        <div className="row">
          <span className="count">{words(draft)} {words(draft) === 1 ? "word" : "words"}</span>
          <span className="spacer" />
          <button className="btn" disabled={logged} onClick={() => log(null)}>{logged ? "Logged" : "Log this rep"}</button>
          {aiOn && <button className="btn primary" disabled={fbState?.kind === "busy"} onClick={getFeedback}>Get AI feedback</button>}
        </div>
      </div>

      {fbState?.kind === "signin" && <SignInPrompt text="Sign in with Google to get AI feedback. It's free and takes one tap." onSignIn={onSignIn} />}
      {fbState && fbState.kind !== "signin" && (
        <div className="feedback">
          <div className={"status" + (fbState.kind === "err" ? " err" : "")}>
            {fbState.kind === "busy" && <span className="pulse" />}<span>{fbState.text}</span>
          </div>
        </div>
      )}
      {fb && fbState?.kind !== "busy" && <Feedback fb={fb} />}

      <div className="sheet plain">
        <p className="panel-title">Self-check before you move on</p>
        <ul className="checks">
          {c.checks.map((t, i) => (
            <li key={t}>
              <label>
                <input type="checkbox" id={"ck" + i} checked={!!(S.checks[q.id] || [])[i]}
                  onChange={(e) => { const v = e.target.checked; update((s) => { (s.checks[q.id] = s.checks[q.id] || [])[i] = v; }); }} />
                <span>{t}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {supabase && (
        <Discussion q={q} draft={draft} session={session} profile={profile} isAdmin={isAdmin} onSignIn={onSignIn}
          onPostQuestion={onPostQuestion} onPosted={onPosted} reloadFeed={reloadFeed} />
      )}
    </section>
  );
}

function Feedback({ fb }) {
  return (
    <div className="feedback">
      <div className="fb-head">
        <div className="score">{fb.score}<small>/10</small></div>
        <div className="verdict">{fb.verdict}</div>
      </div>
      {fb.rubric?.length > 0 && (
        <div className="rubric">
          {fb.rubric.map((r, i) => (
            <div className="rrow" key={i}>
              <b>{r.c}</b>
              <div className="dots" aria-label={`${r.s} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= r.s ? "on" : ""} />)}</div>
              <span>{r.n}</span>
            </div>
          ))}
        </div>
      )}
      <div className="cols">
        <div><p className="panel-title good-t">What worked</p><ul>{(fb.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        <div><p className="panel-title bad-t">What to fix</p><ul>{(fb.gaps || []).map((s, i) => <li key={i}>{s}</li>)}</ul></div>
      </div>
      {fb.follow && <div><p className="panel-title">Likely follow-up</p><div className="followup">{fb.follow}</div></div>}
      {fb.outline?.length > 0 && <div><p className="panel-title">A stronger answer would cover</p><ol className="outline">{fb.outline.map((s, i) => <li key={i}>{s}</li>)}</ol></div>}
    </div>
  );
}
