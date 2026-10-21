export const CATS = {
  product: { label: "Product sense", mins: 20, fw: "Product design (CIRCLES)", use: "Design X, improve Y, favorite product",
    steps: ["Clarify the goal, platform and constraints", "Pick one user segment and say why", "List 3–4 pain points and rank them", "Brainstorm 3 solutions, pick one, name the trade-off", "Define one success metric and one guardrail"],
    checks: ["Named one specific user segment", "Ranked pain points before solutions", "Explained a trade-off", "Ended with a success metric"] },
  metrics: { label: "Metrics", mins: 15, fw: "Goal → north star → inputs", use: "Define success, pick a north star",
    steps: ["State the product's goal in one line", "Walk the user journey end to end", "Pick a north star tied to value delivered", "Add 2–3 input metrics that move it", "Name a guardrail you won't sacrifice"],
    checks: ["Stated the product goal first", "Picked one north star and justified it", "Added input metrics", "Named a guardrail"] },
  rca: { label: "Root cause", mins: 20, fw: "Root-cause tree", use: "Metric dropped, metric spiked",
    steps: ["Clarify the metric definition and time window", "Rule out tracking or data bugs", "Check internal changes: releases, pricing, experiments", "Check external causes: competitors, seasonality, outages", "Segment by platform, geography, new vs returning", "Pick the likeliest hypothesis and say how you'd confirm it"],
    checks: ["Clarified the metric and timeframe", "Ruled out data issues", "Segmented the change", "Proposed how to verify"] },
  guess: { label: "Guesstimate", mins: 10, fw: "Estimation", use: "How many / how much",
    steps: ["Define exactly what you're counting", "Choose top-down or bottom-up", "Segment the population", "Say each assumption out loud with a round number", "Calculate, then sanity-check against something you know"],
    checks: ["Defined the scope", "Stated assumptions with numbers", "Showed the math", "Sanity-checked the result"] },
  strategy: { label: "Strategy", mins: 15, fw: "Should we do it?", use: "Enter a market, launch a plan, why did X do Y",
    steps: ["Clarify the company's goal", "Size the market and the user need", "Check fit with strengths and existing users", "Compare 2–3 options, including doing nothing", "Name the biggest risk", "Give a clear recommendation"],
    checks: ["Clarified the company goal", "Considered alternatives", "Named the biggest risk", "Gave a clear yes or no"] },
  execution: { label: "Execution", mins: 12, fw: "Prioritize & decide", use: "Trade-offs, delays, sprint planning",
    steps: ["Restate the goal and the constraint", "List the options and who is affected", "Score with RICE or impact vs effort", "Decide, and say what you're giving up", "Say how you'll communicate it"],
    checks: ["Restated goal and constraint", "Used a prioritization method", "Owned the trade-off", "Covered stakeholder communication"] },
  behavioral: { label: "Behavioral", mins: 8, fw: "STAR + learning", use: "Tell me about a time…",
    steps: ["Situation in two lines", "Task: what you owned", "Action: what you did, using “I”, not “we”", "Result: numbers if you have them", "Learning: what you'd do differently"],
    checks: ["Kept the situation short", "Used “I” for your actions", "Shared a measurable result", "Said what you learned"] },
};

export const EXTRA_FW = [
  { fw: "RICE scoring", use: "Ranking features or a backlog", steps: ["Reach: users affected per quarter", "Impact: 0.25 (minimal) to 3 (massive)", "Confidence: 50%, 80% or 100%", "Effort: person-months", "Score = Reach × Impact × Confidence ÷ Effort"] },
  { fw: "HEART metrics", use: "Measuring user experience", steps: ["Happiness: satisfaction, NPS, ratings", "Engagement: depth and frequency of use", "Adoption: new users of a feature", "Retention: users who come back", "Task success: completion rate, time, errors"] },
];

export const DIFFS = ["Easy", "Medium", "Hard"];

// Keep in sync with supabase/schema.sql section 10 (same slugs and text)
export const LIBRARY = [
  { id: "p1", c: "product", d: "Easy", m: 15, q: "Design a product that helps first-year college students land their first internship." },
  { id: "p2", c: "product", d: "Medium", m: 20, q: "Improve Google Maps for two-wheeler riders in Indian cities." },
  { id: "p3", c: "product", d: "Medium", m: 15, q: "Design an alarm clock for people who are hard of hearing." },
  { id: "p4", c: "product", d: "Medium", m: 20, q: "Improve the Swiggy experience when a group of friends orders together." },
  { id: "p5", c: "product", d: "Easy", m: 10, q: "What's your favorite app, and what one thing would you change about it?" },
  { id: "p6", c: "product", d: "Medium", m: 20, q: "Design a feature that reduces food waste for a quick-commerce grocery app." },
  { id: "p7", c: "product", d: "Medium", m: 20, q: "Build a product that helps elderly parents manage their daily medicines." },
  { id: "m1", c: "metrics", d: "Medium", m: 15, q: "You're the PM for Instagram Reels. What's your north star metric, and why?" },
  { id: "m2", c: "metrics", d: "Medium", m: 15, q: "How would you measure the success of UPI AutoPay?" },
  { id: "m3", c: "metrics", d: "Easy", m: 12, q: "Spotify launches Blend, a shared playlist for two friends. Define its success metrics." },
  { id: "m4", c: "metrics", d: "Medium", m: 15, q: "LinkedIn adds the “Open to Work” photo frame. How do you know it worked?" },
  { id: "m5", c: "metrics", d: "Medium", m: 15, q: "What would you track for a new food-delivery membership with free delivery?" },
  { id: "r1", c: "rca", d: "Medium", m: 20, q: "Swiggy's daily orders dropped 15% yesterday. Investigate." },
  { id: "r2", c: "rca", d: "Medium", m: 20, q: "Driver cancellations on Uber rose 10% week over week. Why?" },
  { id: "r3", c: "rca", d: "Hard", m: 20, q: "YouTube's daily active users are up, but total watch time is flat. What's going on?" },
  { id: "r4", c: "rca", d: "Hard", m: 20, q: "Free-trial sign-ups for your SaaS product are up 30%, but paid conversion is down. Diagnose it." },
  { id: "r5", c: "rca", d: "Easy", m: 15, q: "Your app's store rating fell from 4.5 to 3.9 in two weeks. Where do you start?" },
  { id: "g1", c: "guess", d: "Medium", m: 10, q: "Estimate the number of cups of chai sold in Bengaluru every day." },
  { id: "g2", c: "guess", d: "Medium", m: 10, q: "Estimate how many laptops are sold in India each year." },
  { id: "g3", c: "guess", d: "Medium", m: 12, q: "Estimate the annual revenue of a single pizza delivery outlet in a metro city." },
  { id: "g4", c: "guess", d: "Hard", m: 12, q: "Estimate how many people are riding the Delhi Metro at 6 PM on a weekday." },
  { id: "g5", c: "guess", d: "Easy", m: 10, q: "How many cricket bats are sold in India in a year?" },
  { id: "s1", c: "strategy", d: "Hard", m: 20, q: "Should Zomato launch 10-minute medicine delivery?" },
  { id: "s2", c: "strategy", d: "Medium", m: 15, q: "A streaming app is considering a ₹149/month mobile-only plan in India. Would you launch it?" },
  { id: "s3", c: "strategy", d: "Medium", m: 12, q: "Why do you think WhatsApp launched Channels?" },
  { id: "s4", c: "strategy", d: "Medium", m: 15, q: "You're a PM at Notion. Should Notion build its own AI meeting-notes feature?" },
  { id: "e1", c: "execution", d: "Easy", m: 10, q: "You have five feature requests and one sprint. How do you decide what ships?" },
  { id: "e2", c: "execution", d: "Medium", m: 12, q: "Engineering says launch will slip three weeks. Marketing already announced the date. What do you do?" },
  { id: "e3", c: "execution", d: "Easy", m: 10, q: "Write a short problem statement for a bill-splitting feature in a payments app." },
  { id: "b1", c: "behavioral", d: "Easy", m: 8, q: "Tell me about a time you disagreed with a teammate." },
  { id: "b2", c: "behavioral", d: "Easy", m: 8, q: "Tell me about a project that failed. What did you learn?" },
  { id: "b3", c: "behavioral", d: "Easy", m: 8, q: "Why product management, and why now?" },
  { id: "b4", c: "behavioral", d: "Medium", m: 8, q: "Tell me about a time you used data to change someone's mind." },
].map((q) => ({ ...q, source: "library" }));

/* Today's question: same pick for everyone on the same calendar date.
   Used by the app (viewer's local date) and by /api/today (India date). */
export function dailyIdFor(dateStr) {
  let x = 0;
  for (const ch of dateStr) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return LIBRARY[x % LIBRARY.length].id;
}

/* Role levels as PM Radar names them, used by "Prep for this role" links. */
export const LEVELS = {
  intern: { label: "Internship", diff: "Easy or Medium" },
  entry: { label: "APM / entry-level", diff: "Medium" },
  pm: { label: "PM", diff: "Medium or Hard" },
  senior: { label: "Senior / lead PM", diff: "Hard" },
};
