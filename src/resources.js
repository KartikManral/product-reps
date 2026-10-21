// Free PM learning resources. Every link goes to the author's or publisher's own site,
// and each was checked to be free to read (no paywall) on 21 Oct 2026.
// Only add resources their authors publish for free — never copied PDFs of paid books.
//
// types: question types this helps with (same keys as CATS in data.js), plus "interview".
export const RESOURCE_TYPES = {
  interview: "Interview prep",
  product: "Product sense",
  metrics: "Metrics",
  rca: "Root cause",
  guess: "Guesstimate",
  strategy: "Strategy",
  execution: "Execution",
  behavioral: "Behavioral",
};

export const FORMATS = ["Book", "Guide", "Essay", "Course", "Playbook", "Podcast"];

export const RESOURCES = [
  // Interview prep
  { id: "gpm-bpm", title: "Good Product Manager / Bad Product Manager", by: "Ben Horowitz · a16z", format: "Essay", types: ["interview", "behavioral"], time: "10 min read",
    why: "The classic one-page bar for what a PM owns and how they behave.", url: "https://a16z.com/good-product-manager-bad-product-manager/" },
  { id: "hire-pm", title: "How to Hire a Product Manager", by: "Ken Norton", format: "Essay", types: ["interview"], time: "25 min read",
    why: "What PM interviewers look for, from a former Google product leader.", url: "https://www.bringthedonuts.com/essays/productmanager.html" },
  { id: "pm-q-types", title: "The 8 types of PM interview questions", by: "IGotAnOffer", format: "Guide", types: ["interview"], time: "40 min read",
    why: "Every question type with sample answers and 100+ practice questions.", url: "https://igotanoffer.com/blogs/product-manager/product-manager-interview-questions" },
  { id: "lenny-podcast", title: "Lenny's Podcast", by: "Lenny Rachitsky", format: "Podcast", types: ["interview", "strategy"], time: "~1 h per episode",
    why: "Long interviews with product leaders on how they think, hire and decide.", url: "https://www.lennysnewsletter.com/podcast" },

  // Product sense
  { id: "product-sense", title: "How to Crack Product Sense Interviews", by: "IGotAnOffer", format: "Guide", types: ["product", "interview"], time: "30 min read",
    why: "A step-by-step answer framework with example questions and mock interviews.", url: "https://igotanoffer.com/en/advice/product-sense-interviews" },
  { id: "startup-school", title: "Startup School", by: "Y Combinator", format: "Course", types: ["product", "strategy"], time: "Self-paced videos",
    why: "Talking to users, finding product-market fit and measuring growth.", url: "https://www.startupschool.org/" },
  { id: "dont-scale", title: "Do Things that Don't Scale", by: "Paul Graham", format: "Essay", types: ["product"], time: "25 min read",
    why: "Why great products start by serving a few users by hand.", url: "https://paulgraham.com/ds.html" },
  { id: "pendo-ai-pm", title: "Becoming an AI-native Product Manager", by: "Pendo", format: "Course", types: ["product", "execution"], time: "Self-paced course",
    why: "A free course on how PM work changes when you build with AI.", url: "https://www.pendo.io/product-management-basics-certification/" },

  // Metrics
  { id: "north-star", title: "The North Star Playbook", by: "Amplitude", format: "Playbook", types: ["metrics"], time: "~1.5 h read",
    why: "How to pick one north star metric and the input metrics that move it.", url: "https://amplitude.com/books/north-star" },
  { id: "metric-q", title: "How to crack product metrics questions", by: "IGotAnOffer", format: "Guide", types: ["rca", "metrics", "interview"], time: "30 min read",
    why: "Defining success metrics and diagnosing metric changes, with examples.", url: "https://igotanoffer.com/blogs/product-manager/product-metric-interview-questions" },
  { id: "16-metrics", title: "16 Startup Metrics", by: "a16z", format: "Essay", types: ["metrics"], time: "20 min read",
    why: "Plain definitions of the business metrics interviewers expect you to know.", url: "https://a16z.com/16-startup-metrics/" },
  { id: "retention", title: "Losing 80% of mobile users is normal", by: "Andrew Chen", format: "Essay", types: ["metrics"], time: "10 min read",
    why: "Real retention curves, and what the best apps do differently.", url: "https://andrewchen.com/new-data-shows-why-losing-80-of-your-mobile-users-is-normal-and-that-the-best-apps-do-much-better/" },
  { id: "ab-testing", title: "A/B Testing", by: "Google · Udacity", format: "Course", types: ["metrics"], time: "Self-paced course",
    why: "Designing experiments and choosing metrics, taught by Google data scientists.", url: "https://www.udacity.com/course/ab-testing--ud257" },

  // Root cause
  { id: "postmortem", title: "Postmortem Culture: Learning from Failure", by: "Google SRE book, chapter 15", format: "Book", types: ["rca", "execution"], time: "20 min read",
    why: "How Google investigates what went wrong without blaming people.", url: "https://sre.google/sre-book/postmortem-culture/" },
  { id: "five-whys", title: "5 Whys Analysis", by: "Atlassian Team Playbook", format: "Guide", types: ["rca"], time: "10 min read",
    why: "A simple way to dig from a symptom down to its root cause.", url: "https://www.atlassian.com/team-playbook/plays/5-whys" },

  // Guesstimate
  { id: "market-sizing", title: "Market Sizing: Step-by-Step Guide", by: "Hacking the Case Interview", format: "Guide", types: ["guess"], time: "30 min read",
    why: "A repeatable estimation method, worked examples and 30 practice questions.", url: "https://www.hackingthecaseinterview.com/pages/market-sizing" },

  // Strategy
  { id: "aggregation", title: "Aggregation Theory", by: "Ben Thompson · Stratechery", format: "Essay", types: ["strategy"], time: "15 min read",
    why: "Why platforms like Google, Uber and Netflix win their markets.", url: "https://stratechery.com/2015/aggregation-theory/" },
  { id: "ask-gib", title: "How do all your product strategy frameworks fit together?", by: "Gibson Biddle, ex-Netflix VP Product", format: "Essay", types: ["strategy"], time: "15 min read",
    why: "Netflix's way of linking strategy, metrics and roadmap.", url: "https://askgib.substack.com/p/ask-gib-how-do-all-your-product-strategy" },
  { id: "svpg", title: "SVPG articles", by: "Marty Cagan", format: "Essay", types: ["strategy", "product"], time: "10–15 min each",
    why: "Product discovery, empowered teams, and PM vs project manager.", url: "https://www.svpg.com/articles/" },

  // Execution
  { id: "rice", title: "RICE: Simple prioritization for product managers", by: "Sean McBride · Intercom", format: "Essay", types: ["execution"], time: "10 min read",
    why: "The scoring method behind most “how would you prioritise” answers.", url: "https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/" },
  { id: "prd", title: "How to create a product requirements document", by: "Atlassian", format: "Guide", types: ["execution"], time: "10 min read",
    why: "What goes in a PRD, with a free template.", url: "https://www.atlassian.com/agile/product-management/requirements" },
  { id: "shape-up", title: "Shape Up", by: "Ryan Singer · Basecamp", format: "Book", types: ["execution"], time: "~4 h read",
    why: "How Basecamp shapes, bets on and ships work in six-week cycles.", url: "https://basecamp.com/shapeup" },
  { id: "scrum-guide", title: "The Scrum Guide (2020)", by: "Ken Schwaber & Jeff Sutherland", format: "Guide", types: ["execution"], time: "30 min read",
    why: "The official, short definition of sprints, roles and ceremonies.", url: "https://scrumguides.org/scrum-guide.html" },
  { id: "design-sprint", title: "The Design Sprint", by: "GV", format: "Guide", types: ["execution", "product"], time: "20 min read",
    why: "How to go from problem to tested prototype in five days.", url: "https://www.gv.com/sprint/" },

  // Behavioral
  { id: "amazon-interview", title: "Your complete guide to the Amazon interview process", by: "Amazon", format: "Guide", types: ["behavioral", "interview"], time: "15 min read",
    why: "Amazon's own guide to the STAR method and what they ask.", url: "https://www.aboutamazon.com/news/workplace/amazon-interview-guide" },
  { id: "amazon-lps", title: "Amazon Leadership Principles", by: "Amazon", format: "Guide", types: ["behavioral"], time: "10 min read",
    why: "The 16 principles many companies borrow for behavioral interviews.", url: "https://www.amazon.jobs/content/en/our-workplace/leadership-principles" },
];

/* Best thing to read for one question type: unread first, then resources mainly about
   that type (first in its types), in the curated order above; courses and podcasts last. */
const SLOW = { Course: 1, Podcast: 1 };
export function pickResource(type, read = {}) {
  const list = RESOURCES.map((r, i) => ({ r, i }))
    .filter(({ r }) => r.types.includes(type))
    .sort((a, b) =>
      (!!read[a.r.id] - !!read[b.r.id]) ||
      ((a.r.types[0] !== type) - (b.r.types[0] !== type)) ||
      ((SLOW[a.r.format] || 0) - (SLOW[b.r.format] || 0)) ||
      (a.i - b.i));
  return list[0]?.r || null;
}
