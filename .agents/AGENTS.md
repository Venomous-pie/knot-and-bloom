# Knot & Bloom — Workspace Rules

## Frontend Design System

Before writing or editing **any** frontend UI code (components, screens, pages, styles), you MUST first read and follow the design guide at:

**`c:\Users\alain\knot-and-bloom\frontend\DESIGN.md`**

This file is the single source of truth for:
- Color tokens (use the dashboard color constants, never invent hex values)
- Typography (always `fontFamily: 'Quicksand'` on every `<Text>`)
- Spacing, border radius, and shadow values
- Page structure template (header bar + maxWidth scroll container)
- Component patterns (Card, StatCard, Buttons, Chips, Badges, Empty States)
- Icon library (`lucide-react-native` only — not Ionicons)
- Data formatting (currency with `₱` + `en-PH`, date formats)
- The new-page checklist (run through before completing any new screen)

**You must consult DESIGN.md before every new page or component you build in the `frontend/` directory.**

## Project Context

- **Platform:** Knot & Bloom — a curated handcrafted goods marketplace for Filipino micro-creators (students, hobbyists, single parents).
- **Stack:** React Native (Expo Router) frontend, Express + Prisma + PostgreSQL backend.
- **Vision doc:** `c:\Users\alain\knot-and-bloom\VISION.md`
- **Business model:** `c:\Users\alain\knot-and-bloom\BUSINESS_MODEL.md`

Before making product or feature decisions, refer to VISION.md to check if the feature aligns with the platform's core principle:
> *"Does this make it meaningfully easier for a Filipino student, single parent, hobbyist, or small hancrafter to sell what they make?"*
