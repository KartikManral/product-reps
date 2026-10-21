import React from "react";
import { CATS } from "../data.js";

const EMPTY = {
  all: "No questions of this type yet.",
  weak: "No weak spots yet. Questions that score 6/10 or lower in AI feedback show up here so you can redo them.",
  ai: "No AI questions yet. Use “New AI question” on the answer sheet to get a fresh one in any question type.",
  community: "No community questions of this type yet. Add one from the Community tab.",
};

export default function QuestionList({ items, cur, onPick, cat, setCat, src, setSrc, done, scores, today, allDone, hasCommunity }) {
  return (
    <aside className="list-pane">
      <label className="small" htmlFor="src">Show</label>
      <select className="src" id="src" value={src} onChange={(e) => setSrc(e.target.value)}>
        <option value="all">Question library</option>
        <option value="weak">Weak spots to redo</option>
        <option value="ai">My AI-generated questions</option>
        {hasCommunity && <option value="community">Community questions</option>}
      </select>
      <div className="chips">
        {[["all", "All"], ...Object.entries(CATS).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={cat === k} onClick={() => setCat(k)}>{l}</button>
        ))}
      </div>
      {allDone && (
        <div className="note"><b>You've tried every library question.</b> Keep going with fresh AI questions, your weak spots, or questions from the community.</div>
      )}
      <ul className="qlist">
        {!items.length && <li><div className="note">{EMPTY[src]}</div></li>}
        {items.map((q) => {
          const sc = scores[q.id];
          const pre = (q.id === today ? "Today · " : "") + (q.source === "ai" ? (q.company ? `${q.company} · ` : "AI · ") : "") + (q.source === "community" ? `${q.votes} votes · ` : "");
          return (
            <li key={q.id}>
              <button className={"qbtn" + (q.id === cur ? " active" : "")} onClick={() => onPick(q.id)}>
                <span className="qt">{q.q}</span>
                <span className="qm">{pre}{CATS[q.c].label} · {q.d} · {q.m} min</span>
                {done.has(q.id) && <span className={"done" + (sc != null && sc <= 6 ? " low" : "")}>{sc != null ? sc + "/10" : "DONE"}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
