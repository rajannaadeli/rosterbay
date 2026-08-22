# CASE STUDY GENERATOR — run inside the project's repo
### Reusable prompt: produces one portfolio-grade case study .md per project

You are writing a portfolio case study for a real software project. You have two sources: **my raw notes below** (the story: why it exists, what happened, what was hard) and **a strictly budgeted look at the codebase** (the evidence: stack, architecture, scale facts). Notes are the spine; code is the proof. You are not writing marketing copy — you are writing the account of a developer who built a real thing, for an audience of potential clients and hiring managers judging proficiency.

---

## INPUT 1 — My raw notes (I fill this before running)

```
PROJECT NAME: RosterBay

ONE-LINE (what it is): A live workforce-operations platform — shift rostering,
GPS clock-in, and certification compliance — built for staffing and facility-
services companies, running as a fully explorable public demo.

ORIGIN (why it was built, who asked, how it started): After building a multi-
tenant workforce platform for an Australian labour-hire client, I kept seeing
the same operational problems across the whole deskless-work industry —
rosters in spreadsheets, certifications expiring silently, timesheets chased
over WhatsApp. Nobody asked for RosterBay. I built it as my own complete,
opinionated answer: a real product anyone can open and click, and the
foundation I now build client projects on. Solo, evenings and weekends,
alongside a full-time job.

WHO USES/USED IT (honest): Demo only — a fictional Adelaide cleaning-and-
security company (Torrens Facility Services) with 14 seeded workers and 5
sites. Publicly explorable with no signup; data resets nightly.

REAL IMPACT (honest, concrete; numbers only if true): It's the anchor of my
freelance positioning — a live product a prospect reaches in one click instead
of a screenshot gallery. A phone clock-in appears on the admin dashboard in
under a second. The codebase doubles as the starter skeleton for client
projects in this vertical, which is where my fixed-price delivery speed comes
from. No real users, and it doesn't pretend otherwise.

PROBLEM 1 → Night shifts cross midnight. A 10pm–6am shift belongs to two days
at once, and any naive roster grid renders it wrong twice — either clipped at
midnight or duplicated. → I rebuilt the roster as a proportional time-grid
(shifts drawn to scale on a 24h axis) and render wrapping shifts as paired
bars with chevron caps on each day, hover-linked so both halves highlight
together. → Night work now reads correctly at a glance, and the grid handles
the case every generated roster UI silently fails.

PROBLEM 2 → Compliance had to actually block, not just warn. Every job site
requires specific certifications (First Aid, police check, security licence),
and assigning a worker with an expired cert is a real-world liability, not a
cosmetic error. → I built the assignment conflict engine as a pure, unit-
tested function — cert coverage, double-booking, weekly-hours checks — and
made it visible during the drag itself: hover a worker over a shift and the
target rings teal (eligible) or red (blocked) before you drop, with an
override-with-logged-reason path for certs and no override ever for double-
booking. → The domain rule became a physical interaction; the seeded worker
with an expired First Aid cert is visibly locked out of the hospital roster.

PROBLEM 3 (optional) → A public demo decays: visitors rename workers, delete
shifts, and seeded dates go stale, so most demos are dead within a week. → The
seed is a single idempotent SQL function generating everything relative to
now() in Australia/Adelaide — including one shift computed to be in progress
at whatever moment you open it — reset nightly at 03:00 ACST via pg_cron, with
a keep-alive job so the free-tier database never pauses. → The demo is alive
at any moment anyone clicks it: someone is always mid-shift, the live map is
never empty, and visitors are told to break things freely.

PROUDEST DETAIL (one specific thing): Shift-offer broadcasting is a genuine
race — several workers can tap Accept at once — and the arbiter is a partial
unique index in Postgres: first accepted response wins at the database level,
losers see the card flip to "Filled" in realtime, no error, no crash.

HARDEST STRETCH (one honest moment): The week I admitted the UI problem.
Functionally everything worked, but the interface read as generated — flat
default components, broken map markers, no depth. I stopped adding features
and spent two full passes rebuilding the visual system: layered dark theme,
mono numerals for all operational data, and hand-drawn SVG components (the
proportional roster, a coverage heat-ribbon, a certification-expiry runway)
that no component library ships.

TIMELINE + MY ROLE: ~6 weeks of evenings and weekends in mid-2026, alongside
a full-time job. Solo: product decisions, data model, design system, web and
mobile code, deployment, and ops.

LINKS (live / repo / demo): rosterbay.com (admin + landing) ·
worker.rosterbay.com (worker app, browser phone-frame)

MUST NOT CLAIM: The prior client project's name or the client's identity (say
only "an Australian labour-hire company"). Any real users, customers, or
revenue. Never present RosterBay as a commercial product in market — it is a
demonstration platform and the case study says so plainly.

```

If a field is empty, do not invent it — work without it and list it in GAPS at the end.

---

## INPUT 2 — Codebase reconnaissance

Priority order (stop early if you already have enough):
1. `README`, `CLAUDE.md`, `DECISIONS.md`, `/docs` — often 80% of the technical story
2. Root `package.json` (and one per app in a monorepo) — stack, scripts, dependencies
3. Schema: migrations folder or models — **skim names and table/entity list only**
5. At most 20 core feature files, chosen by name, **first ~300 lines each**, only when a claim in my notes needs technical verification

**Never open:** node_modules, lockfiles, tests, assets, generated code, styles, or any file end-to-end.

Produce a private **Technical Inventory** (not part of the output): stack + versions, architecture pattern (monolith/multi-app/multi-tenant/etc.), 3–5 genuinely notable engineering facts, and honest scale facts (N tables, N app surfaces, realtime yes/no, auth model). Where my notes and the code disagree, trust the **code for technical facts** and the **notes for story facts**, and list every discrepancy in GAPS.

---

## VOICE CONTRACT — this is what "doesn't sound like AI" means operationally

- First person singular. Contractions allowed. Write like explaining the project to a smart friend who's also a developer.
- **Banned outright:** leverage, seamless, robust, cutting-edge, delve, journey, empower, elevate, revolutionize, game-changer, "best practices", "isn't just X — it's Y", "In today's world", exclamation marks, rhetorical questions.
- **Numbers beat adjectives; concrete nouns beat abstractions.** Not "significantly improved the workflow" — "the owner stopped keeping the paper register." If no number exists, use a concrete observable fact, never a vague superlative.
- **Rhythm:** vary sentence length hard. Some sentences should be four words. No two consecutive paragraphs of the same length. Max 4 sentences per paragraph.
- **Scale honesty:** never dress a small project as an enterprise one. A tool used by one business, described precisely, reads as craft; the same tool wrapped in growth language reads as a lie. The impressive thing about small projects is the *quality of decisions* — write toward that.
- **One human admission, mandatory:** each case study contains one honest "what I'd do differently" or "where I got it wrong first." This is a trust feature, not a weakness.
- **Two specific human details, mandatory:** pull them from my notes (the deadline, the client's actual complaint, the constraint that shaped a decision). Specificity is the strongest anti-generated signal that exists.
- Before finishing, re-read the draft against this contract and fix violations. If any sentence could appear unchanged in any other project's case study, rewrite it — that's the definition of filler.

---

## OUTPUT STRUCTURE — adapted per project, not photocopied

Target 700–1,200 words of body text. Use this skeleton, but **rename section headers to fit each project's actual story** — five case studies with identical headers read as a template, which defeats the purpose.

1. **Title + deck.** Project name; one line stating what it is and for whom. No slogan energy.
2. **Facts strip.** `Role · Timeline · Stack (≤5 items) · Status · [Links]` — one line, pipe-separated, machine-parseable (the site will render it as chips).
3. **Three proof chips.** Honest, concrete: real outcomes where they exist ("in production at one retail shop since 2024"), technical scale facts where they don't ("3 app surfaces · 14-table multi-tenant schema · sub-second realtime"). Never invented usage numbers.
4. **Context.** 2–3 paragraphs: the world before this existed, why it got built, who asked. From my notes.
5. **Challenges.** 2–3 short blocks, each one distinct tension (a constraint, a competing requirement, a thing that made this non-trivial). Each ends with a screenshot placeholder if a visual fits.
6. **The build — decision sections.** The heart. 3–5 sections, each shaped exactly as: *the situation → the decision I made → why (including what I rejected) → what it produced.* Mine these from my PROBLEM entries plus 1–2 notable items from the Technical Inventory. Each section gets a screenshot placeholder.
7. **Under the hood.** One tight paragraph on architecture + stack, written for a technical evaluator. Optional diagram placeholder.
8. **What shipped.** The honest outcome. Repeat/expand the proof chips. If the honest outcome is "a working product with no users yet," say so plainly and state what it demonstrates instead — that sentence, written without flinching, builds more trust than any inflation.
9. **Looking back.** The mandatory human admission, 2–4 sentences.

**Screenshot placeholder convention** (I'll capture these after):
`> [SCREENSHOT: <exactly what to capture> — <one line on why it sits here>]`
Place 4–7 per case study, always adjacent to the claim they support.

---

## DELIVERY

- Write the file to `cases/<project-slug>.md`.
- After the case study, append two sections **outside** the case study body:
  - `## GAPS` — every missing fact, unanswered question, and notes-vs-code discrepancy, as a checklist for me.
  - `## CAPTURE LIST` — the screenshot placeholders repeated as a flat shot list so I can capture them in one session.
- Report your read count against the 15-file budget. If you exceeded it, say so and why.