import React from "react";
import { CATS, EXTRA_FW } from "../data.js";

export default function Frameworks({ hideIntro }) {
  return (
    <section>
      {!hideIntro && <p className="fw-intro">The structures interviewers expect for each question type. Use them as scaffolding, not a script: name the step, then make it specific to the product.</p>}
      <div className="fw-grid">
        {[...Object.values(CATS), ...EXTRA_FW].map((f) => (
          <article className="fw" key={f.fw}>
            <h3>{f.fw}</h3>
            <p className="use">Use for: {f.use}</p>
            <ol>{f.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          </article>
        ))}
      </div>
    </section>
  );
}
