import React, { useMemo, useState } from "react";
import { CATS } from "../data.js";
import { RESOURCES, RESOURCE_TYPES, FORMATS, pickResource } from "../resources.js";
import Frameworks from "./Frameworks.jsx";

const ExternalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

/* weakSpot: { type, avg, retry } or null — the question type with the lowest recent AI scores */
export default function Learn({ S, update, weakSpot, onRetry }) {
  const [mode, setMode] = useState("reading");
  const [type, setType] = useState("all");
  const [format, setFormat] = useState("all");
  const [hideRead, setHideRead] = useState(false);
  const read = S.read || {};

  const list = useMemo(() => RESOURCES.filter((r) =>
    (type === "all" || r.types.includes(type)) &&
    (format === "all" || r.format === format) &&
    (!hideRead || !read[r.id])
  ), [type, format, hideRead, read]);

  const readCount = RESOURCES.filter((r) => read[r.id]).length;
  const pick = weakSpot ? pickResource(weakSpot.type, read) : null;
  const toggleRead = (id) => update((s) => { s.read = s.read || {}; if (s.read[id]) delete s.read[id]; else s.read[id] = Date.now(); });

  return (
    <section className="learn">
      <div className="learn-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="learn-title">Learn</h2>
          <p className="fw-intro" style={{ margin: "4px 0 0" }}>
            {mode === "reading"
              ? "Free books, essays, courses and playbooks, published free by their own authors. Every link opens the official source."
              : "The structures interviewers expect for each question type. Use them as scaffolding, not a script."}
          </p>
        </div>
        <div className="seg" role="group" aria-label="Show">
          <button aria-pressed={mode === "reading"} onClick={() => setMode("reading")}>Reading list</button>
          <button aria-pressed={mode === "frameworks"} onClick={() => setMode("frameworks")}>Frameworks</button>
        </div>
      </div>

      {mode === "frameworks" && <Frameworks hideIntro />}

      {mode === "reading" && (
        <>
          {pick && (
            <div className="weak-pick">
              <div style={{ flex: "1 1 360px", minWidth: 0 }}>
                <p className="prep-eyebrow">Picked for your weak spot</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>
                  Your recent {CATS[weakSpot.type].label.toLowerCase()} answers averaged {weakSpot.avg}/10. Read <b>{pick.title}</b>
                  {weakSpot.retry ? <>, then retry “{weakSpot.retry.q.length > 70 ? weakSpot.retry.q.slice(0, 68) + "…" : weakSpot.retry.q}”.</> : "."}
                </p>
              </div>
              <div className="row">
                <a className="btn primary" href={pick.url} target="_blank" rel="noopener noreferrer">Open {pick.format.toLowerCase()}</a>
                {weakSpot.retry && <button className="btn" onClick={() => onRetry(weakSpot.retry.id)}>Retry the question</button>}
              </div>
            </div>
          )}

          <div className="learn-filters">
            <div className="chips">
              {[["all", "All"], ...Object.entries(RESOURCE_TYPES)].map(([k, l]) => (
                <button key={k} className="chip" aria-pressed={type === k} onClick={() => setType(k)}>{l}</button>
              ))}
            </div>
            <div className="row" style={{ gap: 14 }}>
              <label className="small" htmlFor="fmt" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                Format
                <select id="fmt" className="field" style={{ width: "auto" }} value={format} onChange={(e) => setFormat(e.target.value)}>
                  <option value="all">All formats</option>
                  {FORMATS.map((f) => <option key={f} value={f}>{f}s</option>)}
                </select>
              </label>
              <label className="small" htmlFor="hideRead" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input id="hideRead" type="checkbox" checked={hideRead} onChange={(e) => setHideRead(e.target.checked)} style={{ accentColor: "var(--blue)" }} />
                Hide what I've read
              </label>
            </div>
          </div>

          <p className="small" style={{ margin: 0 }}>
            <b className="count">{list.length}</b> free {list.length === 1 ? "resource" : "resources"} · <b className="count">{readCount}</b> read
          </p>

          {!list.length && <div className="empty">Nothing matches these filters. {hideRead ? "You've read everything here. " : ""}Try another type or format.</div>}

          <div className="res-grid">
            {list.map((r) => (
              <article className="res" key={r.id}>
                <div className="meta">
                  <span className="tag">{r.format}</span>
                  <span className="tag src-t">{RESOURCE_TYPES[r.types[0]]}</span>
                  <span className="tag free">Free</span>
                </div>
                <h3 className="res-title">{r.title}</h3>
                <p className="small" style={{ margin: "-4px 0 0" }}>{r.by}</p>
                <p style={{ margin: 0, fontSize: 14 }}>{r.why}</p>
                <div className="res-foot">
                  <span className="count" style={{ flex: 1 }}>{r.time}</span>
                  <label className="small" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="checkbox" checked={!!read[r.id]} onChange={() => toggleRead(r.id)} style={{ accentColor: "var(--good)" }} />
                    Read
                  </label>
                  <a className="btn sm" href={r.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", gap: 6, alignItems: "center", textDecoration: "none", color: "var(--ink)" }}>
                    Open <ExternalIcon />
                  </a>
                </div>
              </article>
            ))}
          </div>

          <footer className="learn-foot">
            <span>Only resources their authors publish for free. Paid books and copied PDFs are never listed.</span>
            <a href="mailto:kartikmanral1@gmail.com?subject=Product%20Reps%3A%20free%20resource%20suggestion">Suggest a free resource</a>
          </footer>
        </>
      )}
    </section>
  );
}
