import React from "react";
import { CATS, LEVELS } from "../data.js";
import { supabase } from "../lib.js";
import { SignInPrompt } from "./ui.jsx";

/* Shown when someone arrives from PM Radar's "Prep for this role" button:
   ?prep=<company>&level=<intern|entry|pm|senior>&role=<job title> */
export default function PrepPanel({ prep, questions, community, cur, onPick, onGenerate, gen, session, onSignIn, onClose }) {
  const lv = LEVELS[prep.level];
  const busy = gen?.kind === "busy";
  return (
    <section className="prep" aria-label={`Interview prep for ${prep.company}`}>
      <div className="prep-head">
        <div style={{ minWidth: 0 }}>
          <p className="prep-eyebrow">{prep.fromRadar ? "From PM Radar · " : ""}Interview prep</p>
          <h2 className="prep-title">{prep.role ? `${prep.role} at ${prep.company}` : prep.company}</h2>
          {lv && <p className="small" style={{ margin: 0 }}>{lv.label} level</p>}
        </div>
        <button className="btn sm ghost" onClick={onClose} aria-label="Close prep for this company">Close</button>
      </div>

      {questions.length > 0 && (
        <div>
          <p className="panel-title">Questions for {prep.company}</p>
          <ul className="prep-list">
            {questions.map((q) => (
              <li key={q.id}>
                <button className={"prep-q" + (q.id === cur ? " active" : "")} onClick={() => onPick(q.id)}>
                  <span className="prep-q-text">{q.q}</span>
                  <span className="qm">{CATS[q.c].label} · {q.d} · {q.m} min</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!session && supabase && (
        <SignInPrompt text={`Sign in with Google to get 4 practice questions tailored to ${prep.company}. It's free and takes one tap.`} onSignIn={onSignIn} />
      )}
      {session && (
        <div className="row">
          <button className="btn primary" disabled={busy} onClick={onGenerate}>
            {questions.length ? `Get 4 more for ${prep.company}` : `Get 4 questions for ${prep.company}`}
          </button>
          {gen && (
            <span className={"msg" + (gen.kind === "err" ? " err" : "")} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              {busy && <span className="pulse" />}{gen.text}
            </span>
          )}
        </div>
      )}

      {community.length > 0 && (
        <div>
          <p className="panel-title">Asked at {prep.company}, shared by the community</p>
          <ul className="prep-list">
            {community.map((q) => (
              <li key={q.id}>
                <button className={"prep-q" + (q.id === cur ? " active" : "")} onClick={() => onPick(q.id)}>
                  <span className="prep-q-text">{q.q}</span>
                  <span className="qm">{CATS[q.c].label} · {q.d}{q.at ? ` · ${q.at}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="small" style={{ margin: 0 }}>
        AI questions are realistic practice, not leaked interview questions. Pick one, set the timer, and get feedback below.
      </p>
    </section>
  );
}
