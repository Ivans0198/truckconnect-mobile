# Design System: TruckConnect Driver

This file is the visual source of truth. With a mockup, the ui-reviewer
compares against the mockup; **without a mockup, it reviews against this
file**. Keep every rule concrete and verifiable. No "should look nice".

**Mockups live in `docs/mockups/`**: the original HTML plus a PNG of the
phone frame (393×852) for each screen, which is what the ui-reviewer's Mode A
compares against. The table that maps screens to mockups is in
`docs/CLAUDE_MOBILE.md` → "Pantallas y su mockup". Notifications and the three
Incidents screens have **no mockup**: they are reviewed against this file.

Every token below was read from the mockups' Tailwind classes, so the values
are the exact Tailwind palette values, not estimates. In code they live in
`src/theme/tokens.ts`. Use the tokens, never a raw hex in a component.

**The user is driving.** That decides most of the rules below: big targets,
big type, high contrast in direct sunlight, as few taps as possible, nothing
that demands sustained attention (`docs/CLAUDE_MOBILE.md`, rule 2).

## Tokens

### Color

| Role           | Value                      | Tailwind (mockups)  | Usage                                     |
| -------------- | -------------------------- | ------------------- | ----------------------------------------- |
| Primary        | `#2563EB`                  | `blue-600`          | Primary actions, links, active tab, focus |
| Primary press  | `#1D4ED8`                  | `blue-700`          | Pressed state of primary                  |
| Surface        | `#FFFFFF`                  | `white`             | Cards, sheets                             |
| Background     | `#F8FAFC`                  | `slate-50`          | Screen background                         |
| Text           | `#0F172A`                  | `slate-900`         | Body text, titles                         |
| Text secondary | `#64748B`                  | `slate-500`         | Captions, metadata                        |
| Border         | `#E2E8F0`                  | `slate-200`         | Dividers, card and input borders          |
| Brand gradient | `#0C4A6E → #0284C7` (160°) | `sky-900 → sky-600` | Login screen background only              |

**Semantic states.** They follow the traffic light in `docs/CLAUDE_MOBILE.md`
→ "Colores semánticos", the same one the admin panel uses. Each state has a
background, an accent (border, dot, icon) and a text color readable on that
background:

| State              | Background | Accent    | Text      | Means                                                 |
| ------------------ | ---------- | --------- | --------- | ----------------------------------------------------- |
| Success (green)    | `#ECFDF5`  | `#10B981` | `#047857` | DELIVERED, APPROVED, fatigue < 9h, "Start Day" CTA    |
| Warning (amber)    | `#FFFBEB`  | `#F59E0B` | `#B45309` | Doc expiring, fatigue 9–11h, PENDING                  |
| Danger (red)       | `#FEF2F2`  | `#EF4444` | `#B91C1C` | EXPIRED, SUSPENDED, fatigue > 11h, CANCELLED          |
| In progress (blue) | `#EFF6FF`  | `#2563EB` | `#1D4ED8` | EN_ROUTE, AT_PICKUP, LOADING, IN_TRANSIT, AT_DELIVERY |

Rules: success/warning/danger/in-progress appear only with their meaning.
Contrast ≥ 4.5:1 for all text (3:1 for text ≥ 24px), and aim higher: this
app is read in direct sunlight. Never convey a state by color alone: pair it
with a label or icon.

### Spacing

Scale: **4 / 8 / 12 / 16 / 24 / 32 px** (`spacing.xs … xxl` in tokens). Every
margin, padding and gap comes from the scale. Screen horizontal padding is
20–24px in the mockups (`px-5`/`px-6`); use 24 (`xl`) unless matching a
mockup exactly. Same relationship = same spacing.

### Typography

- Font: **Inter** (400, 500, 600, 700, 800), bundled with the app through
  `@expo-google-fonts/inter`. Never loaded from a CDN: a loading dock has no
  signal. In React Native the weight is the family (`Inter_600SemiBold`),
  not `fontWeight`; use `fontFamily.*` from tokens.
- **Minimum 16px for anything the driver must read.** The mockups use 12–14px
  for secondary metadata (`text-xs`/`text-sm`): that is acceptable only for
  non-essential captions, never for an instruction, a status or an action.
- Scale: 16 (body) / 18 (lead, buttons) / 24 (screen title) / 30 (display).
- Hierarchy by size + weight, never by color alone.

### Shape & elevation

- Radius: **16px** (`radius.xl`, Tailwind `rounded-2xl`) for cards, buttons
  and inputs: it is the mockups' dominant radius. 12px (`rounded-xl`) for
  nested elements inside a card. Pills and avatars: full.
- Max 2 elevation levels (card, and bottom sheet/modal).

## Mandatory component states

Every interactive component ships with ALL of: default, pressed, disabled,
and focus-visible on web. Every data view ships with: loading (skeleton),
empty (helpful message + action), error (with Retry, never a crash), and
long-content (text 3× expected length must not break layout). The mockups
are static: these states are not in them and must be added anyway.

Screens that act offline (status changes, POD, incidents) also show a
**pending sync** state.

## Responsive

It is a phone app, portrait only. Viewports to verify: **393×852** (the
mockup frame) and **360×800** (small Android). No tablet or desktop layouts.
Rules: no horizontal scroll; **touch targets ≥ 60×60px** (stricter than the
usual 44: the driver may be wearing gloves or in a moving cab); the primary
action reachable without scrolling.

## Accessibility (hard requirements; axe-core enforces most on web)

- Contrast per the color rules above.
- Every input has a label; every image has an accessibility label;
  icon-only buttons have `accessibilityLabel`.
- Pressables declare `accessibilityRole="button"`.
- Status changes the driver did not trigger use `accessibilityLiveRegion`.
- No information conveyed by color alone.

## Heuristic review questions (ui-reviewer, no-mockup mode)

1. Is there exactly ONE clear primary action per screen?
2. Do all spacings come from the scale, and do equal relationships have equal
   spacing?
3. Is everything that can be aligned actually aligned (edges, baselines)?
4. Is the visual hierarchy right? Is the most important element also the
   most prominent?
5. Do all mandatory states exist and look intentional (including pending
   sync where it applies)?
6. At 360px: no overflow, no horizontal scroll, targets ≥ 60px, essential
   text ≥ 16px?
7. Does any text truncate, overlap or escape its container with real-length
   content (long addresses, long names)?
8. Would this screen look coherent next to the mockups in `docs/mockups/`
   (same tokens, same radius, same spacing rhythm)?
9. Could a driver use it in one glance and one tap, in sunlight?
