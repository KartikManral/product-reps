import React, { useMemo, useState } from "react";
import { CATS, DIFFS } from "../data.js";
import { supabase, ago, dbError } from "../lib.js";
import { Avatar, SignInPrompt, UpArrow } from "./ui.jsx";

export default function Community({ feed, feedState, myVotes, session, uid, isAdmin, onSignIn, onOpen, onPost, onVote, reload }) {
  const [sort, setSort] = useState("top");
  const [cat, setCat] = useState("all");
  const [msg, setMsg] = useState(null);
  const flash = (kind, text) => { setMsg({ kind, text }); setTimeout(() => setMsg(null), 4000); };

  const list = useMemo(() => {
    const l = feed.filter((q) => cat === "all" || q.c === cat);
    if (sort === "new") l.sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
    else if (sort === "active") l.sort((a, b) => (b.answers + b.comments) - (a.answers + a.comments) || Date.parse(b.created) - Date.parse(a.created));
    else l.sort((a, b) => b.votes - a.votes || Date.parse(b.created) - Date.parse(a.created));
    return l;
  }, [feed, sort, cat]);

  if (!supabase) {
    return <div className="empty">Community features turn on once the Supabase keys are added. See the README for setup.</div>;
  }

  const act = async (fn, ok) => { const { error } = await fn(); if (error) flash("err", dbError(error)); else { if (ok) flash("ok", ok); reload(); } };

  return (
    <div className="cm-wrap">
      <div>
        <div className="cm-head">
          <h2>Asked in real interviews</h2>
          <p className="fw-intro" style={{ margin: 0 }}>Questions other aspirants were actually asked. Upvote the useful ones, open any of them to practice, read shared answers and join the discussion.</p>
        </div>
        <div className="cm-tools">
          <div className="seg" role="group" aria-label="Sort">
            {[["top", "Top"], ["new", "New"], ["active", "Most discussed"]].map(([k, l]) => (
              <button key={k} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
            ))}
          </div>
          <select className="field" style={{ width: "auto" }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Question type">
            <option value="all">All types</option>
            {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <span className="spacer" />
          <span className="small">{feed.length} {feed.length === 1 ? "question" : "questions"}</span>
        </div>
        {msg && <p className={"msg " + msg.kind}>{msg.text}</p>}
        <div className="cm-list">
          {feedState === "loading" && <div className="empty">Loading community questions…</div>}
          {feedState === "error" && <div className="empty">Couldn't load community questions. <button className="link" onClick={reload}>Try again</button></div>}
          {feedState === "ready" && !list.length && (
            <div className="empty">{feed.length ? "No questions of this type yet." : "No community questions yet. Add one you were asked in an interview, and it shows up here for everyone."}</div>
          )}
          {feedState === "ready" && list.map((q) => (
            <Item key={q.id} q={q} uid={uid} isAdmin={isAdmin} voted={myVotes.has(q.dbId)}
              onVote={async () => { if (!uid) { flash("err", "Sign in with Google to vote."); return; } try { await onVote(q.dbId); } catch (e) { flash("err", e.message); } }}
              onOpen={() => onOpen(q.id)}
              onDelete={() => act(() => supabase.from("questions").delete().eq("id", q.dbId), "Question deleted.")}
              onHide={() => act(() => supabase.from("questions").update({ hidden: !q.hidden }).eq("id", q.dbId), q.hidden ? "Visible again." : "Hidden from everyone else.")}
              onReport={() => supabase.from("reports").insert({ target_type: "question", target_id: q.dbId, reporter_id: uid })
                .then(({ error }) => flash(error && !/duplicate/i.test(error.message) ? "err" : "ok", error && !/duplicate/i.test(error.message) ? dbError(error) : "Reported. Thanks for flagging it."))} />
          ))}
        </div>
      </div>
      <aside className="cm-side">
        <div className="sheet plain">
          <p className="panel-title">Add a question you were asked</p>
          {session ? <AddForm feed={feed} onPost={onPost} onOpen={onOpen} /> : <SignInPrompt text="Sign in with Google to add questions, vote and comment." onSignIn={onSignIn} />}
        </div>
      </aside>
    </div>
  );
}

function Item({ q, uid, isAdmin, voted, onVote, onOpen, onDelete, onHide, onReport }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <article className="cm-item">
      <button className="vote" aria-pressed={voted} aria-label={`${voted ? "Remove upvote" : "Upvote"}, ${q.votes} votes`} onClick={onVote}>
        <UpArrow />{q.votes}
      </button>
      <div style={{ minWidth: 0 }}>
        <p className="cm-q">{q.q}</p>
        <div className="cm-meta">
          <span>{CATS[q.c].label} · {q.d}</span>
          {q.at && <span>Asked at: {q.at}</span>}
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <Avatar url={q.authorAvatar} name={q.authorName} sm />{q.authorId === uid ? "You" : q.authorName || "Someone"} · {ago(q.created)}
          </span>
          {q.hidden && <span className="tag d-Hard">Hidden</span>}
        </div>
        <div className="cm-actions">
          <button className="btn sm primary" onClick={onOpen}>Practice</button>
          <button className="btn sm" onClick={onOpen}>{q.answers} {q.answers === 1 ? "answer" : "answers"} · {q.comments} {q.comments === 1 ? "comment" : "comments"}</button>
          {q.authorId === uid && (confirm
            ? <><span className="small">Delete this question and its answers?</span><button className="btn sm ghost" style={{ color: "var(--bad)" }} onClick={onDelete}>Delete</button><button className="btn sm ghost" onClick={() => setConfirm(false)}>Keep</button></>
            : <button className="btn sm ghost" onClick={() => setConfirm(true)}>Delete</button>)}
          {isAdmin && q.authorId !== uid && <button className="btn sm ghost" onClick={onHide}>{q.hidden ? "Unhide" : "Hide"}</button>}
          {uid && q.authorId !== uid && <button className="btn sm ghost" onClick={onReport}>Report</button>}
        </div>
      </div>
    </article>
  );
}

function AddForm({ feed, onPost, onOpen }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("product");
  const [diff, setDiff] = useState("Medium");
  const [at, setAt] = useState("");
  const [st, setSt] = useState(null);
  async function submit(e) {
    e.preventDefault();
    const body = text.trim().replace(/\s+/g, " ");
    if (body.length < 15) { setSt({ kind: "err", text: "Write the full question, at least a short sentence." }); return; }
    const dup = feed.find((q) => q.q.toLowerCase() === body.toLowerCase());
    if (dup) { setSt({ kind: "err", text: "That question is already on the board. Upvote it instead." }); return; }
    setSt({ kind: "busy", text: "Adding…" });
    try {
      await onPost({ body: body.slice(0, 400), category: type, difficulty: diff, asked_at: at.trim().slice(0, 80) });
      setText(""); setAt(""); setSt({ kind: "ok", text: "Added. Thanks for sharing." });
    } catch (err) { setSt({ kind: "err", text: err.message }); }
  }
  return (
    <form className="cm-form" onSubmit={submit}>
      <label className="small" htmlFor="cmQ">Question</label>
      <textarea id="cmQ" maxLength={400} placeholder="e.g. How would you improve Zepto's search for first-time users?" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="two">
        <select className="field" value={type} onChange={(e) => setType(e.target.value)} aria-label="Question type">
          {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="field" value={diff} onChange={(e) => setDiff(e.target.value)} aria-label="Difficulty">
          {DIFFS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>
      <label className="small" htmlFor="cmAt">Where were you asked? (optional)</label>
      <input className="field" id="cmAt" maxLength={80} placeholder="e.g. Fintech startup, APM intern, 2026" value={at} onChange={(e) => setAt(e.target.value)} />
      <button className="btn primary" disabled={st?.kind === "busy"}>Add question</button>
      {st && <p className={"msg" + (st.kind === "err" ? " err" : st.kind === "ok" ? " ok" : "")} style={{ margin: 0 }}>{st.text}</p>}
    </form>
  );
}
