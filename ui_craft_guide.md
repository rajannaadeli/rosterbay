# WhiteFleet Mobile — UI Craft & Transformation Guide

> **What this is:** the design-craft companion to `CLAUDE.md`. Use it two ways: (1) keep it in the repo so the AI references it whenever it builds or transforms a screen, and (2) paste it as the prompt when running a transformation pass on a feature. It exists to take our **basic UI to a premium, modern, loved-app standard** — incrementally, one or two features at a time.

---

## 0. The one rule that governs all the others

**Understand the intention behind each principle and apply it to *our* use case. Never copy the reference screens literally.**

Every reference image in this guide comes from a **notes app**. WhiteFleet is a **field-workforce app** for blue-collar workers on job sites — often outdoors, gloved, glancing at the phone for two seconds between tasks. The *premium feeling* of those references transfers completely. Their *content and layout* does not. A "+ create note" FAB in the reference becomes, for us, a prominent **Clock In** action — same intention (one unmissable primary action), different content.

So for every screen: extract the principle's intention → ask what that means for a worker doing this specific task → design for that. Imitation gives us a pretty notes app. Intention gives us a premium WhiteFleet.

---

## 1. The working method (mandatory — follow for every feature)

Do **not** start coding from a request. Run this loop, one or two features at a time, never bulk:

1. **Analyse the requirement.** What is the worker actually trying to accomplish on this screen? What is the single most important job? What data does it show, and what are its real states (loading, empty, error, partial, success)? What's the physical context (outdoors, mid-shift, low attention)?
2. **Design the ideal UI for *this* use case.** Decide the layout, the one primary action, and which patterns serve it (tab vs. sheet, list vs. carousel, gesture vs. button) — choosing by the *intentions* in §3, not by habit. Sketch every state. Explicitly decide what to **keep, change, or delete** from the current basic version.
3. **Plan the implementation.** List the components to build or modify, the tokens needed, and any **customisations to RN Reusables or the token config** required to hit the target — we are allowed and expected to modify components and tokens when the design needs it. Call out anything to verify. Show me the plan; wait for approval.
4. **Build one screen to the full quality bar (§4).** All states, tokens only, gestures, motion, polish.
5. **Review on a real device.** Native feel — spacing rhythm, scroll, transitions, haptics — only shows on device. Refine until it *feels* premium, not just looks correct in a diff.
6. **Commit, then move on.** Small reversible commits. Take the next one or two features. Never transform the whole app in one pass.

---

## 2. What "premium" actually is (so we can reproduce the feeling, not just the rules)

The reference apps feel premium because of intangibles. Name them, then build them:

- **Restraint.** Fewer elements, more space. The instinct to fill the screen is the enemy. Premium UIs are confident enough to leave room.
- **Generous, consistent spacing** drawn from the token scale — never ad-hoc pixel values. Rhythm and breathing room read as quality.
- **Soft depth, not hard borders.** Group with subtle surface contrast or gentle elevation, calm rounded shapes, and consistent radii.
- **Motion with meaning.** Transitions that reveal spatial relationships; gesture-driven physics where the background shifts or scales as a sheet/drawer moves. Smooth, never janky.
- **Haptics on the actions that matter** — clock-in confirmation, accepting an invite, completing a task. A tiny physical response makes the app feel real.
- **Considered states.** Loading skeletons that mirror the final layout; empty states that teach; error states that recover. These are not afterthoughts — they are most of the premium feeling.
- **Ruthless consistency.** The same patterns everywhere, so the whole app feels like one hand made it. Consistency beats novelty every time.

---

## 3. The principles — intention first, then our translation

For each: the **intention** (why it exists), the **reference image** (the visual target for quality), and how it maps to **WhiteFleet**.

### 3.1 Navigation — make the daily loop and the one key action thumb-reachable
**Intention:** reduce cognitive and physical load. The few most important destinations and the single most important action must be reachable by thumb without thinking. A FAB is not "a plus button" — it is *the one action the app exists for, made unmissable*.
**References:** `bottom_navigatio.png` (floating bar, 3–5 items + prominent action), `multi_action_menu_click_focused_view.png` (the action expands into a contextual menu and the icon morphs to a close state), `swipe_back_gesture_animation.png` (overflow lives in a drawer that pulls the main screen away).
**WhiteFleet translation:** we have ~12 worker screens — too many for a bar. Put the **daily loop** in the tabs (Home/Today, Schedule, Tasks, plus one) and push the rest to a **More** surface. Our "FAB-equivalent" is the **primary action of the current context — most often Clock In/Out — not a generic create button.** Make that one action unmissable. Never cram all screens into the bar; never bury Clock In.

### 3.2 Typography & spacing — scale up for legibility, build hierarchy by size and weight
**Intention:** legibility at a glance and at distance; hierarchy comes from type scale and weight, not from clutter or color noise. On mobile, text scales **up**, not down.
**WhiteFleet translation:** our workers glance mid-task, outdoors, in sunlight. Use a **generous base size and strong weight contrast** for hierarchy, and **high contrast** throughout. The numbers that matter — shift times, hours logged, clock status — should be **large and instantly readable** as the loudest thing on the screen.

### 3.3 Single direction per section — one axis of movement per visual group
**Intention:** a phone is a one-dimensional surface; forcing the eye to scan a 2D grid creates fatigue and decision load. Each section moves in **one** direction only.
**References:** `mobile_sizing_scale.jpg` (a vertical Calendar list beside a horizontal Spotify carousel — each picks one axis), `issue_with_card_nesting_inside_another_double_padding.jpg` (a clean vertical feed with consistent padding).
**WhiteFleet translation:** **Today** is vertical sections; if a section holds multiple items (e.g. several shifts today) it is *either* a vertical list *or* a horizontal carousel — **never a grid**. Schedule is vertical. Resist dashboard-style multi-direction layouts; they're the #1 tell of a web-dashboard-ported-to-mobile.

### 3.4 Cards & the no-double-nesting rule — group with whitespace, one card depth
**Intention:** cards substitute for the whitespace we can't afford on mobile; they group related meaning. **Nesting a card inside a card doubles the padding**, cramps everything, and destroys the calm.
**Reference:** `issue_with_card_nesting_inside_another_double_padding.jpg` (the problem named in its own filename).
**WhiteFleet translation:** a shift card, a task card, a document card — **one card level, maximum.** Inside a card, separate items with **spacing or hairline dividers, not inner cards.** Use one consistent padding token. If you feel the urge to nest, switch to whitespace grouping instead. Killing double-padding is one of the fastest upgrades from "basic" to "premium."

### 3.5 One screen, one thing — every screen has a single job
**Intention:** focus. The user should always know exactly what this screen is for. The home/hub is the only exception (it's a launchpad).
**Reference:** `single_screen_single_action_example.png` (a note editor that contains *only* the tools to edit that note).
**WhiteFleet translation:** the **Clock-In screen just clocks in** (with the minimum context: where, which shift). **Task detail** shows only that task and its action. **Document upload** does only that. Do not sprinkle unrelated widgets, "recent" lists, or cross-sells onto a focused screen. Only **Today** earns hub status.

### 3.6 Bottom sheets — make a contextual choice without losing your place
**Intention:** let the user pick something or take a sub-action while staying visually anchored to their current task, preserving spatial continuity instead of yanking them to a new page.
**References:** `bottom_sheet_menu_to_the_top_with_actions.jpg` (a Templates picker as a sheet, with explicit confirm/cancel), `swipe_down_gesture.png` (pull-down to dismiss, underlying screen still present).
**WhiteFleet translation:** the **company switcher** (multi-tenant — a worker swaps active company), **task action menus**, **document-type pickers**, and **filters** should be **bottom sheets**, not full navigations. Keep the worker anchored to where they were.

### 3.7 Gestures — let motion replace chrome, and teach it subtly
**Intention:** gestures hide UI we'd otherwise have to draw, freeing space, and make the app feel physical and responsive. The app should teach them with subtle affordances and respond with motion (background zoom/shift, slight scale).
**References:** `swipe_back_gesture_animation.png` (swipe to reveal the drawer; main screen pulls away), `long_press_menu.png` (long-press blurs the background and scales the item, revealing Pin/Lock/Share/Delete), `swipe_down_gesture.png` (pull-to-dismiss).
**WhiteFleet translation:** **swipe-back everywhere** (native iOS edge gesture), **pull-to-refresh** on lists (Today, Schedule, Tasks), **pull-to-dismiss** sheets, and **long-press on a task or document** for contextual actions (view / replace / delete) with a blur-and-scale focus effect. Let backgrounds react for physicality. **Caveat:** gestures *augment* primary actions — never make Clock In or Accept discoverable *only* by a hidden gesture.

### 3.8 Empty states — the empty screen is the onboarding
**Intention:** a blank screen is a dead end; the empty state is where you teach the first action. No-results states must acknowledge the miss and offer a way forward.
**Reference:** `empty_state_onboarding.png` (illustration + copy + an arrow pointing straight at the primary action).
**WhiteFleet translation:** a brand-new worker has **no shifts, no documents, no invitations, no tasks** — so these are the screens users see *first*. Each needs a **designed full-screen empty state**: a simple illustration, one line of plain-language guidance, and a clear pointer to the next action (e.g. *"No documents yet — add your licences and certificates to stay job-ready,"* pointing to the add action). For search/filter no-results: name what was searched and offer a reset. This is the visible half of `CLAUDE.md`'s four-states rule.

---

## 4. The quality bar — a screen is not "done" until all of this is true

- It has **one clear job** and **one primary action** (hub screens excepted).
- **All four states** are designed and built: loading (skeleton matching final layout), empty (teaching), error (recoverable), success.
- **Tokens only** — no inline colors or magic spacing; **no double-nested cards**; one consistent padding rhythm.
- **Type is large, high-contrast, and hierarchical**; the most important number/status is the loudest element.
- **One direction per section**; no 2D grids.
- **Contextual choices use bottom sheets**; lists support pull-to-refresh; back and long-press gestures are wired where they help.
- **Tap targets ≥44pt**, primary action larger; comfortable for a gloved thumb.
- **Motion and haptics** on the key actions; the screen was **reviewed on a real device** and *feels* right.
- It is **visually consistent** with the rest of the app — same components, same rhythm.

If any line fails, the screen is still in progress.

---

## 5. Anti-patterns to hunt down and kill (the "basic UI" tells)

These are the signatures of the web-dashboard-ported-to-mobile look we are transforming away from:

- Cards nested in cards; cramped or inconsistent padding.
- Small, low-contrast text; hierarchy faked with color instead of size/weight.
- 2D grids and multi-direction sections on a phone.
- Everything crammed onto one screen; no single focus.
- Blank empty states (empty cards, spinners with no guidance).
- Full-page navigations for what should be a bottom sheet.
- No gestures, no pull-to-refresh, no motion — static and lifeless.
- Tiny tap targets; primary action the same size as everything else.
- Inconsistent components screen-to-screen (looks like several hands built it).

---

## 6. Reference image index

| File | Teaches |
|---|---|
| `bottom_navigatio.png` | Floating bottom bar, 3–5 items + one prominent action |
| `multi_action_menu_click_focused_view.png` | Primary action expands to a contextual menu; icon morphs to close |
| `swipe_back_gesture_animation.png` | Overflow in a drawer; main screen pulls away on the gesture |
| `mobile_sizing_scale.jpg` | One direction per section (vertical list vs. horizontal carousel) |
| `issue_with_card_nesting_inside_another_double_padding.jpg` | Clean vertical feed + the double-nesting/double-padding problem to avoid |
| `single_screen_single_action_example.png` | One screen, one thing — a fully focused editor |
| `bottom_sheet_menu_to_the_top_with_actions.jpg` | Bottom sheet for a contextual choice, with confirm/cancel |
| `swipe_down_gesture.png` | Pull-to-dismiss a sheet; underlying screen stays present |
| `long_press_menu.png` | Long-press → blur background + scale item + contextual menu |
| `empty_state_onboarding.png` | Empty state that onboards: illustration + copy + pointer to the action |

**How to use the images in practice:** when transforming a specific feature, attach the relevant reference image alongside this guide and instruct: *"match the quality and the intention of this reference; adapt the content to WhiteFleet's <feature>."* The image sets the bar; this guide ensures we translate rather than copy.