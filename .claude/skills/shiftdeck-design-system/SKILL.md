---
name: shiftdeck-design-system
description: Design tokens, semantic status-color system, typography, spacing/radius/shadow rules, and micro-interaction specs for ShiftDeck (web admin console in Tailwind + shadcn, mobile worker app in NativeWind). Use whenever building, styling, or reviewing any screen, component, chart, or map element on either platform, or when the two platforms need to look and feel like one product.
---

# ShiftDeck Design System

ShiftDeck is a workforce-ops demo. Its entire job is to look like a $50k/mo SaaS product, not a hackathon prototype. The two things that separate those are **restraint** (one accent color, not five) and **consistency** (a status pill means the same thing everywhere, forever). This skill is the single source of truth for both. If a screen you're building isn't described here, stop and use the exact values below rather than inventing new ones.

## Non-negotiable rule

**Every color in this app is one of six values.** No new hex codes, no "just this once" blue badge, no chart palette with its own colors. If you think you need a new color, you don't — reuse ink, a status color at lower opacity, or a neutral gray from the Stone scale.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `surface` | `#FAFAF9` | Page/canvas background (Stone-50) |
| `ink` | `#1C1917` | Primary text, icons (Stone-900) |
| `ink-muted` | `#78716C` | Secondary text, timestamps, helper copy (Stone-500) |
| `border` | `#E7E5E4` | 1px hairlines (Stone-200) |
| `accent` | `#0F766E` | The ONE brand color — primary buttons, active nav, links, focus rings, chart accents. Deep teal, not indigo — indigo is what every other dashboard uses; that's the point. |
| `success` | `#16A34A` | compliant · approved · on-site · filled |
| `warning` | `#D97706` | expiring · pending · soft-warn (e.g. hours threshold) |
| `danger` | `#DC2626` | expired · unfilled · flagged · hard-block |

### Web (Tailwind v4 / shadcn theme)

```css
@theme {
  --color-surface: #FAFAF9;
  --color-ink: #1C1917;
  --color-ink-muted: #78716C;
  --color-border: #E7E5E4;
  --color-accent: #0F766E;
  --color-success: #16A34A;
  --color-warning: #D97706;
  --color-danger: #DC2626;
  --radius: 10px;
}
```

Wire these into the shadcn theme (`--primary`, `--ring`, etc.) rather than overriding component-by-component — the whole point of shadcn here is that you customize the preset **once**, before the first screen, per the build sequence's Phase 0.

### Mobile (NativeWind v4 `tailwind.config.js`)

```js
theme: {
  extend: {
    colors: {
      surface: '#FAFAF9',
      ink: '#1C1917',
      'ink-muted': '#78716C',
      border: '#E7E5E4',
      accent: '#0F766E',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
    borderRadius: { DEFAULT: 10 },
  },
}
```

These two token blocks must stay byte-identical in meaning. If you change one, change the other in the same session — a teal that's slightly different between the phone-frame web export and the admin console is the kind of detail a prospect notices even if they can't name why the demo feels "off."

## Semantic status-color rule (the thing that sells the demo)

A user should learn this mapping in 10 seconds during MM1/MM2 and never be surprised by it again:

- **Green (`success`)** — compliant, approved, on-site right now, offer filled
- **Amber (`warning`)** — expiring soon (certs, pending timesheet review), soft policy warning (e.g. >38 hrs this week)
- **Red (`danger`)** — expired, unfilled shift, flagged timesheet, hard-block

This mapping is fixed across every surface: worker compliance pills, cert wallet cards, roster chips, timesheet flags, dashboard KPI accents. Never repurpose red for something merely "important," and never invent a fourth status color (e.g. no blue "info" badge) — force everything into compliant/warning/blocking, because that trichotomy is the actual business logic (see `shiftdeck-data-model` for where these states are computed).

## Typography

- Web: **Inter**, loaded once, weights 400/500/600/700 only — no italics, no light weight.
- Mobile: system font (San Francisco / Roboto) — don't bundle Inter on mobile, it's not worth the bundle-size cost for a demo and the platform font reads as more native anyway.
- Numerals in KPI cards and countdowns should use tabular-nums so counters don't jitter horizontally when animating.

## Spacing, radius, elevation

- Radius: **10px** everywhere — cards, buttons, inputs, chips, modals. Do not mix radii.
- Shadows: whisper-quiet only (`shadow-sm` equivalent, ~2-4px blur, low opacity). Never a heavy drop shadow — 1px `border` tokens do most of the visual separation, shadows are a light lift for cards/modals over the map.
- Density: **comfortable** in cards and detail panels, **compact** in dense tables (Timesheets, Roster's worker list). Don't apply table-compact spacing to KPI cards or vice versa.

## Micro-interactions (cheap, deliberately used — these carry the two Magic Moments)

- Realtime row inserts (activity feed, new timesheet, new offer response): **200ms slide + fade in**, never an abrupt pop.
- Broadcast chip: pulsing ring animation (radar-style) from the moment `Broadcast` is confirmed until the offer resolves to filled or expired.
- Task checklist ticks: a small spring/bounce on check, not a flat toggle — this is a cheap animation with outsized "polished" perception.
- KPI numbers: count up from 0 (or previous value) on load/update rather than snapping.
- Loading states: **skeletons everywhere**, never a bare spinner on a screen that has real layout to preview. A spinner-only screen reads as unfinished; a skeleton reads as fast.

Every one of these exists because the two Magic Moments (live clock-in, broadcast-and-fill) are choreographed video moments — see `shiftdeck-ui-screens` — and a motion detail that's missing or wrong at that exact instant is the single most visible flaw a prospect will notice on rewatch.

## Icons

Phosphor icon set on both platforms (`@phosphor-icons/react` web, `phosphor-react-native` mobile). **Duotone weight** for nav items and status glyphs, **regular weight** everywhere else. Don't mix weights within the same list or toolbar — pick one per context and hold it.

## Dark mode

Light mode is canonical — it's what gets screenshotted and recorded. Dark mode is Phase 5 polish-day work only, and only because shadcn tokens make it near-free once the light tokens above are correct. Never spend Phase 1–4 time on dark mode; if a session drifts toward it, redirect to a light-mode screen still on the build sequence.

## Anti-patterns — actively avoid these

- Adding an indigo/blue-600 primary color "because that's what dashboards use." The teal accent is a deliberate differentiator (see brand table) — don't dilute it.
- Chart sprawl. Recharts is for dashboard sparklines only. If a screen wants a fourth chart type, that's a sign the screen has scope-crept — check `shiftdeck-scope-guard`.
- A generic Tailwind default gray scale mixed in alongside the Stone scale above — pick Stone and stay in it for every gray.
- Spinner-only loading screens (see micro-interactions above).