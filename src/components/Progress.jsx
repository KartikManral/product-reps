import React from "react";
import { CATS, LIBRARY } from "../data.js";
import { streak } from "../lib.js";

export default function Progress({ S, getQ, weak, done, onPick, onRedoWeak }) {
  const A = S.attempts;
  const scored = A.filter((a) => typeof a.score === "number");
  const avg = scored.length ? (scored.reduce((s, a) => s + a.score, 0) / scored.length).toFixed(1) : "–";
  const gaps = Object.values(S.fb).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 5).flatMap((f) => f.gaps || []).slice(0, 8);

  return (
    <section>
      <div className="tiles">
        <div className="tile"><b>{streak(A)}</b><span>Day streak</span></div>
        <div className="tile"><b>{done.size}</b><span>Questions tried</span></div>
        <div className="tile"><b>{avg}</b><span>Avg AI score</span></div>
      </div>

      <div className="split">
        <div>
          <p className="panel-title">Weak spots to redo</p>
          {weak.length ? (
            <>
              <ul className="recent">
                {weak.slice(0, 8).map((w) => (
                  <li key={w.q.id}><span>{w.q.q}</span><button className="btn sm" onClick={() => onPick(w.q.id)}>Redo {w.s}/10</button></li>
                ))}
              </ul>
              <div className="row" style={{ marginTop: 12 }}><button className="btn primary" onClick={onRedoWeak}>Redo all weak spots</button></div>
            </>
          ) : <div className="empty">No weak spots yet. Answers that score 6/10 or lower in AI feedback show up here so you can redo them.</div>}
        </div>
        <div>
          <p className="panel-title">Gaps that keep coming up</p>
          {gaps.length ? <ul className="gaps">{gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
            : <div className="empty">Get AI feedback on a few answers to see the gaps that keep coming up.</div>}
        </div>
      </div>

      <div className="split">
        <div>
          <p className="panel-title">Library coverage by question type</p>
          <div className="bars">
            {Object.entries(CATS).map(([k, c]) => {
              const tot = LIBRARY.filter((q) => q.c === k).length;
              const d = LIBRARY.filter((q) => q.c === k && done.has(q.id)).length;
              return (
                <div className="bar" key={k}>
                  <span>{c.label}</span>
                  <div className="track"><div className="fill" style={{ width: `${(d / tot) * 100}%` }} /></div>
                  <em>{d}/{tot}</em>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <p className="panel-title">Recent reps</p>
          {A.length ? (
            <ul className="recent">
              {A.slice(-10).reverse().map((a, i) => {
                const q = getQ(a.id);
                return (
                  <li key={a.ts + "-" + i}>
                    {q ? <button className="link" style={{ textAlign: "left", color: "var(--ink)", fontWeight: 400, fontSize: 14 }} onClick={() => onPick(q.id)}>{q.q}</button>
                      : <span>{a.q || "Question no longer available"}</span>}
                    <span className={"sc" + (a.score != null && a.score <= 6 ? " low" : "")}>{a.score != null ? `${a.score}/10` : a.date.slice(5)}</span>
                  </li>
                );
              })}
            </ul>
          ) : <div className="empty">No reps yet. Answer today's question and tap “Log this rep” or get AI feedback, and it shows up here.</div>}
        </div>
      </div>
      <p className="small">Your answers and progress are saved in this browser. Anything you share to the community is public.</p>
    </section>
  );
}
