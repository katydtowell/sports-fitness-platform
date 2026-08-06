# SportzGym Ultimate Warrior — Rollout Plan for Dev Handoff

## Purpose

This document organizes the Ultimate Warrior concept into a phased rollout structure so engineering can scope and estimate effort. No dates or timelines are proposed here — phase order reflects priority and dependency, not a schedule. Once effort estimates come back, phase order may shift.

**Key:**
- Items below are pulled directly from the design team’s recommendations unless marked 💡 **Suggestion**, which flags additions or restructuring proposed by Claude for consideration, not decided scope.
- ❓ marks open questions that need a decision before (or during) estimation.

---

## Phase 1: Required for Initial Release

Everything in this phase is considered a hard requirement for launch — the UI overhaul and UX fixes don't stand on their own without these.

### 1. Design System Foundation
- New design system: updated colors, spacing, components.
- **Recommendation:** adopt Flowbite Pro.
- **Alternative:** build a custom design system in-house — longer timeline for both design and dev, higher risk of inconsistency.
- 💡 **Suggestion:** treat this as a "Phase 0" gating decision. Whether we adopt Flowbite Pro or go custom changes the estimate for nearly every other item below (components, layouts, side panels, schedule UI all depend on the underlying system). Recommend developers weigh in on Flowbite Pro vs. custom *before* estimating the rest of Phase 1, since it affects those estimates.

### 2. UX Improvements
- Custom side menu ordering and show/hide controls.
- New side panel layout (inline vs. overlay).
- Improved layouts for existing tools across all features.
  - Scope note: layout/positioning changes only — no new functionality beyond what's specified elsewhere in this document. Developers should estimate the impact of tools moving/relayout, not net-new feature work.

### 3. Schedule Overhaul
- Minimizable, customizable side rail with:
  - Upcoming Today panel
  - Panel for resources, filters, and display preferences
- User-specific display preference settings for the schedule.
- "View by Resource" toggle for daily and weekly schedule views.
  - ❓ **Open question:** Does this replace the existing Resource view, or live alongside it? Current recommendation is to replace it — needs confirmation before dev scopes this, since "replace" vs. "add" are very different efforts.
- Updates to reservation/game/rental details shown in the schedule grid, popovers, and side panels.

### 4. Third-Party Integration
- Userpilot integration, as an interim onboarding solution until a better option is identified (per discussion with Mario—we already use Userpilot but may want a more custom solution in the future).
- 💡 **Suggestion:** flag this to developers as intentionally interim/throwaway scope — worth noting so it's not over-engineered, given it's expected to be replaced later (see Phase 3, item 4).

---

## Phase 2: Required — or Next Priority After Launch

This item may end up in Phase 1 or immediately after, depending on estimate and business timing. It's called out separately because it's motivated by competitive/sales pressure rather than direct UX debt.

### 1. EZCoach — AI-Assisted Scheduling and Booking
- AI-assisted scheduling and booking (name TBD).
- Consider AI-powered phone booking, referencing Baseline's approach as a model.
- 💡 **Suggestion:** since this closes a competitive gap, recommend developers provide two estimates: (a) scheduling/booking only, and (b) scheduling/booking + phone booking, so the business can decide which scope fits the priority window.

---

## Phase 3: Later Priority (Value-Add)

Not required for initial release or immediate competitive parity. Sequencing among these is open.

1. Customizable dashboard with widgets (widget set TBD).
2. Improved AI-assisted support chat.
3. Expanded EZCoach functionality beyond scheduling.
4. Onboarding tool to replace Userpilot.
5. Industry-specific workflow settings — affects layouts, default widgets, terminology (e.g., "Venues" vs. "Lanes," "Trainer" vs. "Instructor"), rental setup, package setup, etc., based on industries selected by the user.
6. Self-provisioning of advanced modules.

💡 **Suggestion:** Item 5 (industry-specific workflows) has downstream implications for almost everything in Phase 1 and 2 — terminology and layout logic touch the design system, schedule, and any new features. Worth a short discovery/scoping pass on this one specifically before it's estimated, since it could either be a config layer (lighter) or a deeper architectural change (heavier) depending on how far "industry-specific" is meant to go.

---

## Design Process for New Feature Work in the Interim

New feature work doesn't stop while Ultimate Warrior is being built and rolled out. Once the new design system is established (Phase 1, item 1), design will begin designing any new features against that new design system rather than the current UI — even for features that will ship before the full Ultimate Warrior rollout.

To support this, design will provide developers with a reference identifying which existing (old-UI) components correspond to each new-design-system component used in a feature's designs. This lets developers:

- Release new features into the current product now, using the current UI, without confusion about which design language to follow.
- Roll those features into Ultimate Warrior later with minimal rework, since they were designed against the new system from the start.

This process depends on the design system decision in Phase 1 being finalized first, since the component reference can't be built until the new system (Flowbite Pro or custom) is locked in.

---

## Open Questions Summary

1. "View by Resource" — replace existing Resource view, or additive? (Design leaning toward replace.)
2. Flowbite Pro vs. custom design system — which direction should developers estimate against first?

---

## Next Steps for Dev Handoff

1. Developers review Phase 1 line items and provide effort estimates (t-shirt size, points, or hours — whatever fits the team's process).
2. Flag any item where scope feels ambiguous so design can clarify before final estimate.
3. Once Phase 1 estimates are in, revisit whether EZCoach (Phase 2) should be pulled into the initial release or scheduled as an immediate fast-follow.
4. Phase 3 items are for awareness only at this stage — no estimate needed yet.
