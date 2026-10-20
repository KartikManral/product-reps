import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, ago, dbError } from "../lib.js";
import { Avatar, SignInPrompt } from "./ui.jsx";

export default function Discussion({ q, draft, session, profile, isAdmin, onSignIn, onPostQuestion, onPosted, reloadFeed }) {
  const uid = session?.user?.id || null;

  if (!q.dbId) {
    if (q.source === "ai") return <PostAiQuestion q={q} uid={uid} onSignIn={onSignIn} onPostQuestion={onPostQuestion} onPosted={onPosted} />;
    return <div className="disc"><p className="small" style={{ margin: 0 }}>Shared answers and discussion load once the database is set up.</p></div>;
  }
  return <Thread q={q} draft={draft} uid={uid} profile={profile} isAdmin={isAdmin} onSignIn={onSignIn} reloadFeed={reloadFeed} />;
}

function PostAiQuestion({ q, uid, onSignIn, onPostQuestion, onPosted }) {
  const [st, setSt] = useState(null);
  async function post() {
    setSt({ kind: "busy", text: "Posting…" });
    try { const id = await onPostQuestion({ body: q.q, category: q.c, difficulty: q.d, minutes: q.m }); onPosted(id); }
    catch (e) { setSt({ kind: "err", text: e.message }); }
  }
  return (
    <div className="disc">
      <div className="disc-head"><h3>Want other people's take?</h3></div>
      <p className="small" style={{ margin: 0 }}>Post this question to the community so others can share their answers and discuss it with you.</p>
      {uid
        ? <div className="row"><button className="btn primary" disabled={st?.kind === "busy"} onClick={post}>Post to community</button>{st && <span className={"msg" + (st.kind === "err" ? " err" : "")}>{st.text}</span>}</div>
        : <SignInPrompt text="Sign in with Google to post questions." onSignIn={onSignIn} />}
    </div>
  );
}

function Thread({ q, draft, uid, profile, isAdmin, onSignIn, reloadFeed }) {
  const dbId = q.dbId;
  const [tab, setTab] = useState("answers");
  const [answers, setAnswers] = useState([]);
  const [comments, setComments] = useState([]);
  const [helpful, setHelpful] = useState(() => new Set());
  const [state, setState] = useState("loading");
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const [a, c] = await Promise.all([
      supabase.from("answer_feed").select("*").eq("question_id", dbId).order("helpful", { ascending: false }).order("created_at", { ascending: false }).limit(200),
      supabase.from("comment_feed").select("*").eq("question_id", dbId).order("created_at", { ascending: true }).limit(1000),
    ]);
    if (a.error || c.error) { setState("error"); return; }
    setAnswers(a.data || []); setComments(c.data || []); setState("ready");
    if (uid && a.data?.length) {
      const { data } = await supabase.from("answer_votes").select("answer_id").eq("user_id", uid).in("answer_id", a.data.map((x) => x.id));
      setHelpful(new Set((data || []).map((r) => r.answer_id)));
    } else setHelpful(new Set());
  }, [dbId, uid]);
  useEffect(() => { load(); }, [load]);

  const byAnswer = useMemo(() => {
    const m = {}; comments.forEach((c) => { if (c.answer_id) (m[c.answer_id] = m[c.answer_id] || []).push(c); }); return m;
  }, [comments]);
  const qComments = comments.filter((c) => !c.answer_id);
  const mine = answers.find((a) => a.author_id === uid);

  const flash = (kind, text) => { setMsg({ kind, text }); setTimeout(() => setMsg(null), 4000); };
  const run = async (fn, okText) => {
    const { error } = await fn();
    if (error) { flash("err", dbError(error)); return false; }
    if (okText) flash("ok", okText);
    await load(); reloadFeed && reloadFeed();
    return true;
  };

  const toggleHelpful = async (a) => {
    if (!uid) { flash("err", "Sign in to mark answers helpful."); return; }
    const had = helpful.has(a.id);
    await run(() => had
      ? supabase.from("answer_votes").delete().eq("answer_id", a.id).eq("user_id", uid)
      : supabase.from("answer_votes").insert({ answer_id: a.id, user_id: uid }));
  };
  const report = async (type, id) => {
    const { error } = await supabase.from("reports").insert({ target_type: type, target_id: id, reporter_id: uid });
    flash(error && !/duplicate/i.test(error.message) ? "err" : "ok", error && !/duplicate/i.test(error.message) ? dbError(error) : "Reported. Thanks for flagging it.");
  };
  const addComment = (body, answerId) => run(() => supabase.from("comments").insert({ question_id: dbId, answer_id: answerId || null, author_id: uid, body }));
  const shareAnswer = (body) => run(() => mine
    ? supabase.from("answers").update({ body, updated_at: new Date().toISOString() }).eq("id", mine.id)
    : supabase.from("answers").insert({ question_id: dbId, author_id: uid, body }), mine ? "Your shared answer is updated." : "Answer shared. Others can now read and comment on it.");

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); flash("ok", "Link copied."); }
    catch { flash("err", "Couldn't copy. Copy the address from your browser instead."); }
  }

  return (
    <div className="disc">
      <div className="disc-head">
        <h3>From the community</h3>
        <span className="spacer" />
        <div className="seg" role="group" aria-label="Show">
          <button aria-pressed={tab === "answers"} onClick={() => setTab("answers")}>Answers ({answers.length})</button>
          <button aria-pressed={tab === "discussion"} onClick={() => setTab("discussion")}>Discussion ({qComments.length})</button>
        </div>
        <button className="btn sm ghost" onClick={copyLink}>Copy link</button>
      </div>
      {msg && <p className={"msg " + msg.kind} style={{ margin: 0 }}>{msg.text}</p>}
      {state === "loading" && <p className="small" style={{ margin: 0 }}>Loading…</p>}
      {state === "error" && <p className="msg err" style={{ margin: 0 }}>Couldn't load the discussion. <button className="link" onClick={load}>Try again</button></p>}

      {state === "ready" && tab === "answers" && (
        <>
          {uid ? <ShareAnswer mine={mine} draft={draft} onShare={shareAnswer} /> : <SignInPrompt text="Sign in with Google to share your answer and comment on others'." onSignIn={onSignIn} />}
          {!answers.length && <p className="small" style={{ margin: 0 }}>No shared answers yet. Practice this one and be the first to share yours.</p>}
          <div>
            {answers.map((a) => (
              <Answer key={a.id} a={a} uid={uid} isAdmin={isAdmin} isHelpful={helpful.has(a.id)} comments={byAnswer[a.id] || []}
                onHelpful={() => toggleHelpful(a)} onComment={(b) => addComment(b, a.id)}
                onDelete={() => run(() => supabase.from("answers").delete().eq("id", a.id), "Answer deleted.")}
                onHide={(h) => run(() => supabase.from("answers").update({ hidden: h }).eq("id", a.id), h ? "Hidden." : "Visible again.")}
                onReport={() => report("answer", a.id)}
                onDeleteComment={(id) => run(() => supabase.from("comments").delete().eq("id", id))}
                onHideComment={(id, h) => run(() => supabase.from("comments").update({ hidden: h }).eq("id", id))}
                onReportComment={(id) => report("comment", id)} />
            ))}
          </div>
        </>
      )}

      {state === "ready" && tab === "discussion" && (
        <>
          {!qComments.length && <p className="small" style={{ margin: 0 }}>No discussion yet. Ask how others would approach it, or share a tip.</p>}
          {qComments.length > 0 && (
            <Comments list={qComments} uid={uid} isAdmin={isAdmin}
              onDelete={(id) => run(() => supabase.from("comments").delete().eq("id", id))}
              onHide={(id, h) => run(() => supabase.from("comments").update({ hidden: h }).eq("id", id))}
              onReport={(id) => report("comment", id)} />
          )}
          {uid ? <Composer placeholder="Add to the discussion…" onSubmit={(b) => addComment(b, null)} /> : <SignInPrompt text="Sign in with Google to join the discussion." onSignIn={onSignIn} />}
        </>
      )}
    </div>
  );
}

function ShareAnswer({ mine, draft, onShare }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const begin = () => { setText(mine?.body || draft || ""); setErr(""); setOpen(true); };
  async function submit() {
    const body = text.trim();
    if (body.length < 40) { setErr("Write at least a few sentences before sharing."); return; }
    setBusy(true);
    const ok = await onShare(body.slice(0, 8000));
    setBusy(false);
    if (ok) setOpen(false);
  }
  if (!open)
    return (
      <div className="row">
        <button className="btn primary" onClick={begin}>{mine ? "Edit my shared answer" : "Share my answer"}</button>
        <span className="small">{mine ? "You've shared an answer to this question." : "Others can read it, mark it helpful and comment."}</span>
      </div>
    );
  return (
    <div className="composer">
      <label className="small" htmlFor="shareBody">Your answer (visible to everyone)</label>
      <textarea id="shareBody" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 160 }} maxLength={8000} />
      <div className="row">
        {draft && text !== draft && <button className="link" onClick={() => setText(draft)}>Use my current draft</button>}
        <span className="spacer" />
        {err && <span className="msg err">{err}</span>}
        <button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn primary" disabled={busy} onClick={submit}>{mine ? "Update answer" : "Share answer"}</button>
      </div>
    </div>
  );
}

function Answer({ a, uid, isAdmin, isHelpful, comments, onHelpful, onComment, onDelete, onHide, onReport, onDeleteComment, onHideComment, onReportComment }) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const long = a.body.length > 700;
  const edited = a.updated_at && Date.parse(a.updated_at) - Date.parse(a.created_at) > 60000;
  return (
    <article className="ans">
      <div className="byline">
        <Avatar url={a.author_avatar} name={a.author_name} sm />
        <b>{a.author_id === uid ? "You" : a.author_name || "Someone"}</b>
        <span>· {ago(a.created_at)}{edited ? " · edited" : ""}</span>
        {a.hidden && <span className="tag d-Hard">Hidden</span>}
      </div>
      <div className={"ans-body" + (long && !expanded ? " clamp" : "")}>{a.body}</div>
      <div className="actions">
        {long && <button className="link" onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : "Show more"}</button>}
        <button className={"link" + (isHelpful ? " on" : "")} aria-pressed={isHelpful} onClick={onHelpful}>Helpful · {a.helpful}</button>
        <button className="link" onClick={() => setShowComments(!showComments)}>{showComments ? "Hide comments" : `Comments · ${comments.length}`}</button>
        {a.author_id === uid && (confirmDel
          ? <><span className="small">Delete your answer?</span><button className="link" style={{ color: "var(--bad)" }} onClick={onDelete}>Delete</button><button className="link" onClick={() => setConfirmDel(false)}>Keep</button></>
          : <button className="link" onClick={() => setConfirmDel(true)}>Delete</button>)}
        {isAdmin && a.author_id !== uid && <button className="link" onClick={() => onHide(!a.hidden)}>{a.hidden ? "Unhide" : "Hide"}</button>}
        {uid && a.author_id !== uid && <button className="link" onClick={onReport}>Report</button>}
      </div>
      {showComments && (
        <div className="cmts">
          {comments.length > 0 && <Comments list={comments} uid={uid} isAdmin={isAdmin} onDelete={onDeleteComment} onHide={onHideComment} onReport={onReportComment} />}
          {uid ? <Composer placeholder="Give feedback on this answer…" onSubmit={onComment} /> : <p className="small" style={{ margin: 0 }}>Sign in to comment.</p>}
        </div>
      )}
    </article>
  );
}

function Comments({ list, uid, isAdmin, onDelete, onHide, onReport }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {list.map((c) => (
        <div className="cmt" key={c.id}>
          <div className="byline">
            <Avatar url={c.author_avatar} name={c.author_name} sm />
            <b>{c.author_id === uid ? "You" : c.author_name || "Someone"}</b>
            <span>· {ago(c.created_at)}</span>
            {c.hidden && <span className="tag d-Hard">Hidden</span>}
          </div>
          <p>{c.body}</p>
          <div className="actions">
            {c.author_id === uid && <button className="link" onClick={() => onDelete(c.id)}>Delete</button>}
            {isAdmin && c.author_id !== uid && <button className="link" onClick={() => onHide(c.id, !c.hidden)}>{c.hidden ? "Unhide" : "Hide"}</button>}
            {uid && c.author_id !== uid && <button className="link" onClick={() => onReport(c.id)}>Report</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Composer({ placeholder, onSubmit }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const ok = await onSubmit(body.slice(0, 1000));
    setBusy(false);
    if (ok !== false) setText("");
  }
  return (
    <form className="composer" onSubmit={submit}>
      <textarea aria-label={placeholder} placeholder={placeholder} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} />
      <div className="row"><span className="count">{text.length}/1000</span><span className="spacer" /><button className="btn sm primary" disabled={busy || !text.trim()}>Post</button></div>
    </form>
  );
}
