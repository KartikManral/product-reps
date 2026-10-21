import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CATS, LIBRARY, LEVELS } from "./data.js";
import { supabase, useStore, dailyId, streak, latestScores, dayStr, fromFeed, callAI, pickDifficulty, rid, dbError } from "./lib.js";
import { Avatar, GoogleButton, TabIcons } from "./components/ui.jsx";
import QuestionList from "./components/QuestionList.jsx";
import Practice from "./components/Practice.jsx";
import Community from "./components/Community.jsx";
import Frameworks from "./components/Frameworks.jsx";
import Progress from "./components/Progress.jsx";
import PrepPanel from "./components/PrepPanel.jsx";

/* Links from PM Radar:
   ?prep=<company>&level=<intern|entry|pm|senior>&role=<title>  company prep
   ?type=<metrics|product|rca|...>                              practise one question type
   ?q=<library id like p1, or a question uuid>                   open one question
   &ref=pm-radar...                                              where the visit came from */
const PARAMS = new URLSearchParams(window.location.search);
const clip = (v, n) => (v || "").replace(/\s+/g, " ").trim().slice(0, n);
const INITIAL_PREP = clip(PARAMS.get("prep"), 80)
  ? { company: clip(PARAMS.get("prep"), 80), role: clip(PARAMS.get("role"), 120), level: LEVELS[PARAMS.get("level")] ? PARAMS.get("level") : "", fromRadar: /pm-radar/i.test(PARAMS.get("ref") || "") }
  : null;
const INITIAL_TYPE = CATS[PARAMS.get("type")] ? PARAMS.get("type") : null;

const TABS = [["practice", "Practice"], ["questions", "Questions"], ["community", "Community"], ["frameworks", "Frameworks"], ["progress", "Progress"]];

export default function App() {
  const [S, update] = useStore();
  const [view, setViewRaw] = useState("practice");
  const [cat, setCat] = useState(INITIAL_TYPE || "all");
  const [src, setSrc] = useState("all");
  const [cur, setCur] = useState(() => {
    if (!INITIAL_TYPE) return dailyId();
    const done = new Set(S.attempts.map((a) => a.id));
    const ofType = LIBRARY.filter((x) => x.c === INITIAL_TYPE);
    return (ofType.find((x) => !done.has(x.id)) || ofType[0]).id;
  });
  const [prep, setPrep] = useState(INITIAL_PREP);
  const [focusType, setFocusType] = useState(INITIAL_TYPE);
  const [prepGen, setPrepGen] = useState(null);

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [libMap, setLibMap] = useState({});          // slug -> uuid
  const [feedRows, setFeedRows] = useState([]);
  const [feedState, setFeedState] = useState(supabase ? "loading" : "off");
  const [myVotes, setMyVotes] = useState(() => new Set());
  const [pendingLink] = useState(() => new URLSearchParams(window.location.search).get("q"));

  const uid = session?.user?.id || null;
  const isAdmin = !!profile?.is_admin;

  /* ── auth ── */
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase || !uid) { setProfile(null); return; }
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle().then(({ data }) => setProfile(data || null));
  }, [uid]);
  const signIn = useCallback(() => {
    if (!supabase) return;
    supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + window.location.pathname + window.location.search } });
  }, []);
  const signOut = useCallback(() => supabase && supabase.auth.signOut(), []);

  /* ── shared data ── */
  useEffect(() => {
    if (!supabase) return;
    supabase.from("questions").select("id,slug").eq("is_library", true).then(({ data }) => {
      const m = {}; (data || []).forEach((r) => { if (r.slug) m[r.slug] = r.id; }); setLibMap(m);
    });
  }, []);
  const loadFeed = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("question_feed").select("*").eq("is_library", false).order("created_at", { ascending: false }).limit(500);
    if (error) { setFeedState("error"); return; }
    setFeedRows(data || []); setFeedState("ready");
  }, []);
  const loadVotes = useCallback(async () => {
    if (!supabase || !uid) { setMyVotes(new Set()); return; }
    const { data } = await supabase.from("question_votes").select("question_id").eq("user_id", uid);
    setMyVotes(new Set((data || []).map((r) => r.question_id)));
  }, [uid]);
  useEffect(() => { loadFeed(); }, [loadFeed, uid]);
  useEffect(() => { loadVotes(); }, [loadVotes]);
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") loadFeed(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [loadFeed]);

  const feed = useMemo(() => feedRows.map(fromFeed).filter((q) => !q.hidden || isAdmin), [feedRows, isAdmin]);

  /* ── question index ── */
  const qmap = useMemo(() => {
    const m = {};
    LIBRARY.forEach((q) => { m[q.id] = { ...q, dbId: libMap[q.id] }; });
    S.custom.forEach((q) => { m[q.id] = { ...q, source: "ai" }; });
    feed.forEach((q) => { m[q.id] = q; });
    return m;
  }, [libMap, S.custom, feed]);
  const getQ = useCallback((id) => qmap[id], [qmap]);
  const q = qmap[cur] || qmap[dailyId()];

  /* deep link ?q=<uuid> */
  const [linkDone, setLinkDone] = useState(!pendingLink);
  useEffect(() => {
    if (linkDone) return;
    if (LIBRARY.some((x) => x.id === pendingLink)) { setCur(pendingLink); setLinkDone(true); return; }
    if (!supabase) { setLinkDone(true); return; }
    const slug = Object.keys(libMap).find((k) => libMap[k] === pendingLink);
    if (slug) { setCur(slug); setLinkDone(true); return; }
    if (feedState !== "ready") return;
    if (feed.some((x) => x.dbId === pendingLink)) { setCur("cm-" + pendingLink); setLinkDone(true); return; }
    supabase.from("question_feed").select("*").eq("id", pendingLink).maybeSingle().then(({ data }) => {
      if (data && !data.is_library) { setFeedRows((r) => [...r, data]); setCur("cm-" + data.id); }
      setLinkDone(true);
    });
  }, [linkDone, pendingLink, libMap, feed, feedState]);

  /* keep the address bar shareable */
  useEffect(() => {
    if (!linkDone) return;
    const url = new URL(window.location.href);
    if (q?.dbId) url.searchParams.set("q", q.dbId); else url.searchParams.delete("q");
    if (!prep) ["prep", "role", "level"].forEach((k) => url.searchParams.delete(k));
    if (!focusType) url.searchParams.delete("type");
    window.history.replaceState(null, "", url.toString());
  }, [q?.dbId, linkDone, prep, focusType]);

  /* ── navigation ── */
  const setView = useCallback((v) => { setViewRaw(v); window.scrollTo(0, 0); }, []);
  const pick = useCallback((id) => { setCur(id); setViewRaw("practice"); window.scrollTo(0, 0); }, []);

  /* ── progress ── */
  const logRep = useCallback((score) => {
    const qq = qmap[cur]; if (!qq) return;
    update((s) => { s.attempts.push({ id: qq.id, q: qq.q, c: qq.c, date: dayStr(), score: score ?? null, ts: Date.now() }); });
  }, [qmap, cur, update]);

  /* ── AI: new question ── */
  const generate = useCallback(async (category) => {
    const c = category || (cat !== "all" ? cat : q.c);
    const d = pickDifficulty(S.attempts, c);
    const existing = [...LIBRARY, ...S.custom, ...feed].filter((x) => x.c === c).slice(-40).map((x) => x.q);
    const r = await callAI(session, { kind: "question", category: c, difficulty: d, existing });
    const nq = { id: "ai-" + rid(), c: r.c, d: r.d, m: r.m, q: r.q, ai: true, ts: Date.now() };
    update((s) => { s.custom.push(nq); if (s.custom.length > 200) s.custom = s.custom.slice(-200); });
    setCur(nq.id);
    return r;
  }, [cat, q, S.attempts, S.custom, feed, session, update]);

  /* ── AI: questions for one company (PM Radar "Prep for this role") ── */
  const prepQuestions = useMemo(() => {
    if (!prep) return [];
    const name = prep.company.toLowerCase();
    return S.custom.filter((x) => (x.company || "").toLowerCase() === name).map((x) => qmap[x.id]).filter(Boolean);
  }, [prep, S.custom, qmap]);
  const prepCommunity = useMemo(() => {
    if (!prep) return [];
    const name = prep.company.toLowerCase();
    return feed.filter((x) => `${x.at} ${x.q}`.toLowerCase().includes(name)).slice(0, 6);
  }, [prep, feed]);
  const generateForCompany = useCallback(async () => {
    if (!prep) return;
    setPrepGen({ kind: "busy", text: `Writing questions for ${prep.company}…` });
    try {
      const r = await callAI(session, { kind: "company", company: prep.company, role: prep.role, level: prep.level, existing: prepQuestions.map((x) => x.q) });
      const made = r.questions.map((x) => ({ id: "ai-" + rid(), c: x.c, d: x.d, m: x.m, q: x.q, ai: true, company: prep.company, ts: Date.now() }));
      update((s) => { s.custom.push(...made); if (s.custom.length > 200) s.custom = s.custom.slice(-200); });
      setCur(made[0].id);
      setPrepGen(null);
    } catch (e) {
      setPrepGen({ kind: "err", text: e.message });
    }
  }, [prep, session, prepQuestions, update]);
  // Arriving signed in with no questions for this company yet: write them straight away (once).
  const [autoTried, setAutoTried] = useState(false);
  useEffect(() => {
    if (!prep || !session || autoTried || prepQuestions.length) return;
    setAutoTried(true);
    generateForCompany();
  }, [prep, session, autoTried, prepQuestions.length, generateForCompany]);

  /* ── community actions ── */
  const postQuestion = useCallback(async ({ body, category, difficulty, asked_at, minutes }) => {
    const { data, error } = await supabase.from("questions")
      .insert({ author_id: uid, body, category, difficulty, asked_at: asked_at || null, minutes: minutes || CATS[category].mins })
      .select("id").single();
    if (error) throw new Error(dbError(error));
    await loadFeed();
    return data.id;
  }, [uid, loadFeed]);
  const toggleVote = useCallback(async (dbId) => {
    if (!uid) return;
    const had = myVotes.has(dbId);
    setMyVotes((s) => { const n = new Set(s); had ? n.delete(dbId) : n.add(dbId); return n; });
    setFeedRows((rows) => rows.map((r) => (r.id === dbId ? { ...r, votes: (r.votes || 0) + (had ? -1 : 1) } : r)));
    const res = had
      ? await supabase.from("question_votes").delete().eq("question_id", dbId).eq("user_id", uid)
      : await supabase.from("question_votes").insert({ question_id: dbId, user_id: uid });
    if (res.error) { await Promise.all([loadVotes(), loadFeed()]); throw new Error(dbError(res.error)); }
  }, [uid, myVotes, loadVotes, loadFeed]);

  /* ── derived ── */
  const done = useMemo(() => new Set(S.attempts.map((a) => a.id)), [S.attempts]);
  const scores = useMemo(() => latestScores(S.attempts), [S.attempts]);
  const weak = useMemo(() => Object.entries(scores).filter(([id, s]) => s <= 6 && qmap[id]).sort((a, b) => a[1] - b[1]).map(([id, s]) => ({ q: qmap[id], s })), [scores, qmap]);

  const listItems = useMemo(() => {
    let items;
    if (src === "weak") items = weak.map((w) => w.q);
    else if (src === "ai") items = S.custom.map((x) => qmap[x.id]).filter(Boolean).reverse();
    else if (src === "community") items = [...feed].sort((a, b) => b.votes - a.votes || Date.parse(b.created) - Date.parse(a.created));
    else items = [...LIBRARY.map((x) => qmap[x.id]), ...S.custom.map((x) => qmap[x.id]).filter(Boolean)];
    return items.filter((x) => cat === "all" || x.c === cat);
  }, [src, cat, weak, S.custom, qmap, feed]);

  const step = useCallback((dir) => {
    const list = listItems.length ? listItems : LIBRARY;
    if (dir === "random") {
      const pool = list.filter((x) => x.id !== cur);
      if (pool.length) setCur(pool[Math.floor(Math.random() * pool.length)].id);
    } else {
      const i = list.findIndex((x) => x.id === cur);
      setCur(list[(i + 1) % list.length].id);
    }
  }, [listItems, cur]);

  const redoWeak = useCallback(() => {
    if (!weak.length) return;
    setSrc("weak"); setCat("all"); setCur(weak[0].q.id);
    setView(window.innerWidth < 960 ? "questions" : "practice");
  }, [weak, setView]);

  return (
    <div className="app" data-view={view}>
      <header className="top">
        <div className="brand">
          <h1><span className="hl">Product</span> Reps</h1>
          <p>Daily PM interview practice for interns. Answer, time yourself, get feedback, learn from others.</p>
        </div>
        <div className="top-right">
          <div className="stat"><b>{streak(S.attempts)}</b><span>Day streak</span></div>
          <div className="stat"><b>{S.attempts.length}</b><span>Reps</span></div>
          {supabase && (session
            ? <button className="me" onClick={signOut} title="Sign out"><Avatar url={profile?.avatar_url} name={profile?.display_name} /><span>Sign out</span></button>
            : <GoogleButton onClick={signIn} label="Sign in" />)}
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Sections">
        {TABS.map(([v, l]) => (
          <button key={v} className="tab" role="tab" data-v={v} aria-selected={view === v} onClick={() => setView(v)}>{TabIcons[v]}{l}</button>
        ))}
      </nav>

      <main>
        {(view === "practice" || view === "questions") && (
          <div className="practice">
            <QuestionList items={listItems} cur={cur} onPick={pick} cat={cat} setCat={setCat} src={src} setSrc={setSrc}
              done={done} scores={scores} today={dailyId()} allDone={LIBRARY.every((x) => done.has(x.id))} hasCommunity={!!supabase} />
            <div className="work" style={{ gap: 16 }}>
            {prep && (
              <PrepPanel prep={prep} questions={prepQuestions} community={prepCommunity} cur={cur} onPick={pick}
                onGenerate={generateForCompany} gen={prepGen} session={session} onSignIn={signIn}
                onClose={() => { setPrep(null); setPrepGen(null); }} />
            )}
            {focusType && !prep && (
              <div className="focus-note">
                <span style={{ flex: 1, minWidth: 180 }}>
                  {/pm-radar/i.test(PARAMS.get("ref") || "") ? "From your PM Radar resume match: " : ""}practising <b>{CATS[focusType].label}</b> questions. Use “Next question” for more.
                </span>
                <button className="btn sm ghost" onClick={() => { setFocusType(null); }}>Done</button>
              </div>
            )}
            <Practice key={q.id} q={q} S={S} update={update} isToday={q.id === dailyId()} onLog={logRep}
              session={session} profile={profile} isAdmin={isAdmin} onSignIn={signIn}
              onNext={() => step("next")} onRandom={() => step("random")} onGenerate={generate}
              onPostQuestion={postQuestion} onPosted={(id) => setCur("cm-" + id)} reloadFeed={loadFeed} />
            </div>
          </div>
        )}
        {view === "community" && (
          <Community feed={feed} feedState={feedState} myVotes={myVotes} session={session} uid={uid} isAdmin={isAdmin}
            onSignIn={signIn} onOpen={pick} onPost={postQuestion} onVote={toggleVote} reload={loadFeed} />
        )}
        {view === "frameworks" && <Frameworks />}
        {view === "progress" && <Progress S={S} getQ={getQ} weak={weak} done={done} onPick={pick} onRedoWeak={redoWeak} />}
      </main>
    </div>
  );
}
