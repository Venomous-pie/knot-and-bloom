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

**Core Documentation:**
Before making product, architectural, or feature decisions, ALWAYS refer to the markdown files in the `docs/` directory (`c:\Users\User\knot-and-bloom\docs\`), ignoring `.docx` files and the `second-brain` folder:
- **`VISION.md`**: The North Star. Use this to check if a feature aligns with the core principle: > *"Does this make it meaningfully easier for a Filipino student, single parent, hobbyist, or small hancrafter to sell what they make?"*
- **`Knot_and_Bloom_Business_Model.md`**: Critical for any backend, payment-related, or transaction flow development (e.g., the 20% deposit via PayMongo, 80% COD, and 12% flat commission).
- **`HOW_SHIPPING_WORKS.md`**: Dictates the logic for delivery methods (Free Pickup vs. Variable Delivery) and the reasoning behind localized shipping fee structures based on distance and seller capabilities.
