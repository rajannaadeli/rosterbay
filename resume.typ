#let accent = rgb("#1a1a1a")
#let muted = rgb("#555555")
#let rule = rgb("#cccccc")

#set page(
  paper: "a4",
  margin: (top: 1.1cm, bottom: 1.1cm, left: 1.5cm, right: 1.5cm),
)
#set text(font: "Charter", size: 11pt, fill: rgb("#1a1a1a"), lang: "en")
#set par(justify: false, leading: 0.44em, spacing: 0.5em)
#set list(spacing: 0.48em)

#let sectionTitle(title) = [
  #v(6.5pt)
  #text(size: 11pt, weight: "bold", tracking: 0.6pt)[#upper(title)]
  #v(-2pt)
  #line(length: 100%, stroke: 0.6pt + rule)
  #v(1pt)
]

#let job(role, org, dates) = [
  #grid(
    columns: (1fr, auto),
    align(left)[#text(weight: "bold", size: 11pt)[#role] #text(fill: muted)[— #org]],
    align(right)[#text(size: 9pt, fill: muted)[#dates]],
  )
]

// ---------- HEADER ----------
#align(center)[
  #text(size: 16.5pt, weight: "bold", tracking: 1pt)[RAJANNA ADELI]
  #v(1pt)
  #text(size: 9.1pt, fill: muted)[
    Full-Stack Developer, TypeScript · React · React Native · Node.js · PostgreSQL
  ]
  #v(2pt)
  #text(size: 8.6pt, fill: muted)[
    Pune, India · +91 93593 79618 · rajannaadeli\@gmail.com · rajanna.dev · github.com/rajannaadeli · linkedin.com/in/rajannaadeli
  ]
]

#v(2pt)

// ---------- SUMMARY ----------
#sectionTitle("Summary")
#text(size: 11pt)[
Full-stack developer with experience across an early-stage startup (core engineer on two production SaaS products), enterprise platform engineering at TCS, and international freelance clients in Australia and the US. I own products end-to-end, architecture, UI/UX, implementation, DevOps, and specialize in TypeScript across the stack: React/Next.js, React Native (Expo), Node.js, and PostgreSQL. Most recent work: *RosterBay* (rosterbay.com), a live demo of workforce-management platform with realtime GPS clock-in, constraint-based rostering, and compliance automation for client engagement.
]

// ---------- EXPERIENCE ----------
#sectionTitle("Experience")

#job("Software Developer", "Tata Consultancy Services · Pune", "[Dec 2025 – Present]")
#v(2pt)
Platform engineering on ServiceNow (JavaScript) for a global energy client, HR Service Delivery and ITSM:
#v(2pt)
- Build and maintain enterprise workflow automation using server- and client-side JavaScript (business rules, script includes, client scripts) across HRSD and Service Catalog modules serving a global employee base.
- Delivered catalog-item enhancements for organization-change workflows, redesigned lookup data models so business-unit, division, and department fields resolve reliably across 8 downstream HR processes; released via managed update sets.
- Diagnosed and resolved a complex ticket-routing defect by tracing behavior across assignment rules, data lookup definitions, and a round-robin assignment engine, restoring correct routing for manufacturing support groups.
- Built a knowledge-base usage audit across *1,300+ service-desk incidents* by querying the platform's m2m data model, delivering a filtered analysis that informed KB cleanup priorities for service leadership.

#v(3pt)
#job("Full-Stack Developer (Core Engineer)", "Bithook · Pune", "[Mar 2025 – Dec 2025]")
#v(2pt)
One of the core engineers at an early-stage startup shipped and operated two production SaaS products, *lemonsoft.in* and *upipe.tech*:
#v(2pt)
- Owned features end-to-end, system architecture, low-level design, UI/UX, implementation, and deployment, as part of a small core team where every engineer carried production responsibility.
- Architected and built scheduling and billing engine in React, TypeScript, and Node.js, serving 50+ active businesses.
- Owned end-to-end DevOps for both products — CI/CD pipelines via GitHub Actions, server provisioning and deployment on AWS EC2, S3 for storage, RDS for managed databases, and PM2 for process management.
- Refactored the loan dashboard, reducing initial page load time by 42%.

#v(3pt)
#job("Independent Full-Stack Developer", "Freelance (Upwork + direct clients)", "[Nov 2023 – Present]")
#v(2pt)
Workforce-management and operations software for international clients (Australia, US):
#v(2pt)
- Designed and built a *multi-tenant workforce-management platform* for an Australian labour-hire company, web admin console, client portal, and React Native worker app covering invite-based onboarding, worker document/consent flows, and shift management (Node.js, PostgreSQL/Supabase, Expo).
- Delivered a 5-month product engagement (OMAC) for an Australian client, scoped at 2 months and extended to 5 on ongoing feature development and maintenance; developed a community platform showcasing Indigenous heritage, events, and cultural initiatives. ★4.9+ Upwork rating.
- Built a production-ready retail POS and inventory system, enabling barcode billing, real-time stock tracking, purchase management, sales reporting, and GST-ready invoice generation.

// ---------- PROJECTS ----------
#sectionTitle("Selected Projects")

#text(weight: "bold", size: 9.8pt)[RosterBay] #text(fill: muted, size: 9.2pt)[— live workforce operations platform demo · rosterbay.com] \
- Solo-built a Workforce Management SaaS demo for client engagement, featuring constraint-based shift rostering, GPS-geofenced mobile clock-in, payroll-ready timesheets with auto review, shift broadcasting with first-accept-wins handling, and a real-time operations dashboard with live maps and activity feed.
- Stack: React + Vite + shadcn/ui admin console; Expo/React Native worker app; Supabase, multi-tenant PostgreSQL with row-level security, Realtime channels, Storage, pg_cron.
- Realtime architecture: a worker's phone clock-in renders on the live admin dashboard in under a second.

#v(2pt)
#text(weight: "bold", size: 9.8pt)[GAD Builder] #text(fill: muted, size: 9.2pt)[— parametric engineering-drawing customization platform · github.com/rajannaadeli/gad-builder-up]
- Design-customization tool automating general-arrangement drawing generation: visual component selection, parametric configuration, dynamic PDF output, automating *70–80% of repetitive drawing-customization work* for design teams. MERN + Tailwind + shadcn.

#v(2pt)
#text(weight: "bold", size: 9.8pt)[Component Store] #text(fill: muted, size: 9.2pt)[— engineering document control system · github.com/rajannaadeli/component-store]
- Versioned drawing management with multi-stage approval workflows, role-based access, notifications, and bulk legacy-drawing import via Excel/filename mapping. Production-ready; complex authorization made simple in the UI.

// ---------- SKILLS ----------
#sectionTitle("Skills")

#grid(
  columns: (auto, 1fr),
  row-gutter: 5pt,
  column-gutter: 8pt,
  text(weight: "bold")[Languages:], [TypeScript, JavaScript (ES2023+), SQL, HTML/CSS],
  text(weight: "bold")[Frontend:], [React 19, Next.js, React Native (Expo), Tailwind CSS, shadcn/ui, TanStack Query \& Router, Zustand, Framer Motion],
  text(weight: "bold")[Backend:], [Node.js (Express, NestJS), PostgreSQL, Supabase (RLS, Realtime, Storage), MongoDB, REST APIs, WebSockets/Realtime],
  text(weight: "bold")[Platform \& Tooling:], [Git/GitHub, CI/CD, AWS, Vercel, Cloudflare, ServiceNow platform scripting, AI-accelerated engineering workflows (Claude Code, Cursor)],
)

// ---------- EDUCATION ----------
#sectionTitle("Education")

#grid(
  columns: (1fr, auto),
  align(left)[#text(weight: "bold")[B.Tech, Computer Science \& Engineering  #text(fill: muted, weight: "medium", size: 9pt)[ #h(6.6cm) [2022-2025] [CGPA 9.0/10]]]
\ SVERI's College of Engineering, Pandharpur],
)