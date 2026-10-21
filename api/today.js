// GET /api/today — today's practice question, for PM Radar's daily email.
// Public and read-only. Uses the India date so the email matches what
// readers in India see on the site that day.
import { LIBRARY, CATS, dailyIdFor } from "../src/data.js";

function indiaDate() {
  const d = new Date(Date.now() + 5.5 * 3600_000);
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`;
}

export default function handler(req, res) {
  const date = indiaDate();
  const id = dailyIdFor(date);
  const q = LIBRARY.find((x) => x.id === id);
  const host = req.headers["x-forwarded-host"] || req.headers.host || "product-reps-lhcq.vercel.app";
  const origin = `https://${host}`;
  res.setHeader("cache-control", "public, s-maxage=900, stale-while-revalidate=3600");
  res.setHeader("access-control-allow-origin", "*");
  res.status(200).json({
    date,
    id: q.id,
    question: q.q,
    category: q.c,
    categoryLabel: CATS[q.c].label,
    framework: CATS[q.c].fw,
    difficulty: q.d,
    minutes: q.m,
    url: `${origin}/?q=${q.id}&ref=pm-radar-email`,
  });
}
