# Knot & Bloom — Frontend Design System

This document is the **single source of truth** for how pages in Knot & Bloom should look and be built.
Every new screen — whether on the seller dashboard, customer-facing, or admin — must follow these patterns to stay visually consistent.

---

## 1. Fonts

Two fonts are loaded globally via `@/constants/fonts.ts`:

| Font | Use |
|---|---|
| **`Quicksand`** | All body text, labels, numbers, UI copy |
| **`Lovingly`** | Brand logo only — never use for UI copy |

### Rules
- **Always** set `fontFamily: 'Quicksand'` on every `<Text>` component. Never rely on the system default.
- `Lovingly` is reserved exclusively for the "Knot&Bloom" wordmark in the sidebar and header.

---

## 2. Color Palette

All colors are defined in `@/constants/theme.ts`. When building pages, use these tokens. Never invent one-off hex codes.

### Dashboard-Specific Tokens

These are consistently defined as local constants at the top of each dashboard file. Copy them into every new dashboard page:

```typescript
const P       = '#B36979'; // Brand primary — Dusty Pink
const P_LIGHT = '#FDEEF1'; // Primary tint (active backgrounds, selected states)
const BG      = '#F4F4F8'; // Page background
const CARD    = '#FFFFFF'; // Card surface
const TEXT    = '#1A1A2E'; // Primary text
const SUB     = '#6B7280'; // Secondary / muted text
const BORDER  = '#F0F0F5'; // Card borders, dividers
const GREEN   = '#10B981'; // Success, earnings, positive trends
const AMBER   = '#F59E0B'; // Warnings, pending states
const RED     = '#EF4444'; // Errors, cancellations, destructive actions
const INDIGO  = '#6366F1'; // Neutral highlight (order counts, analytics)
const TEAL    = '#14B8A6'; // Secondary positive (net earnings)
```

### Global Theme Tokens (from `theme.ts`)

| Token | Hex | Usage |
|---|---|---|
| `theme.colors.primary` | `#B36979` | CTAs, active states, brand elements |
| `theme.colors.primaryLight` | `#E8D5D9` | Hover/tint backgrounds |
| `theme.colors.secondary` | `#567F4F` | Sage green accent |
| `theme.colors.background` | `#FCFAF9` | Page backgrounds (public pages) |
| `theme.colors.surface` | `#FFFFFF` | Cards and elevated surfaces |
| `theme.colors.text` | `#1F2937` | Primary body text |
| `theme.colors.textSecondary` | `#4B5563` | Supporting text |
| `theme.colors.textLight` | `#9CA3AF` | Placeholders, timestamps |
| `theme.colors.border` | `#E5E7EB` | Borders and separators |
| `theme.colors.success` | `#10B981` | Positive states |
| `theme.colors.warning` | `#F59E0B` | Warning states |
| `theme.colors.error` | `#EF4444` | Errors and destructive actions |

### Status / Badge Colors

Used for order status labels throughout the app:

```typescript
PENDING:       '#F59E0B'  // Amber
CONFIRMED:     '#3B82F6'  // Blue
IN_PRODUCTION: '#8B5CF6'  // Purple
READY_TO_SHIP: '#EC4899'  // Pink
SHIPPED:       '#10B981'  // Green
DELIVERED:     '#059669'  // Dark Green
COMPLETED:     '#059669'  // Dark Green
CANCELLED:     '#EF4444'  // Red
DISPUTED:      '#DC2626'  // Dark Red
```

**Badge rendering pattern** — always use 20% opacity background with full color text:
```tsx
<View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: `${statusColor}20` }}>
    <Text style={{ fontWeight: '700', fontSize: 12, color: statusColor }}>
        {status.replace(/_/g, ' ')}
    </Text>
</View>
```

---

## 3. Spacing

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Tight gaps (between icon and label) |
| `sm` | 8px | Default gap inside items |
| `md` | 16px | Standard padding |
| `lg` | 24px | Card padding, section gaps |
| `xl` | 32px | Large section separation |
| `2xl` | 48px | Page-level vertical padding |

**Content max-width rule:** All dashboard content areas are capped and centered:
```tsx
<View style={{ flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
```

---

## 4. Border Radius

| Value | Usage |
|---|---|
| 8px | Small badges, filter chips, checkboxes, InfoBox |
| 12px | Buttons, icon containers, small images |
| 16px | Medium cards |
| **20px** | Stat cards |
| **24px** | Main content cards (most common) |
| 9999px | Pill-shaped status badges and chips |

---

## 5. Shadows

Every card uses the same consistent shadow. Copy this verbatim:

```typescript
// Standard card shadow:
shadowColor: '#000',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.05,
shadowRadius: 12,
elevation: 3,

// Lighter shadow (sub-cards, bell button):
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.07,
shadowRadius: 6,
elevation: 3,
```

---

## 6. Layout Patterns

### Responsive Breakpoint

```typescript
const { width } = useWindowDimensions();
const isDesktop = width >= 1024; // from @/constants/layout.ts
```

### Dashboard Layout (from `_layout.tsx`)

- **Desktop (≥1024px):** `DashboardSidebar` (260px) + content area side by side.
- **Mobile (<1024px):** Stack navigator, `slide_from_right` animation, no sidebar.

You never need to render the sidebar yourself — it is injected by `_layout.tsx` automatically.

### Page Structure Template

Every seller dashboard page follows this structure exactly:

```tsx
export default function MyPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<DataType | null>(null);

    const fetchData = async () => { /* ... */ };
    useEffect(() => { fetchData(); }, []);

    if (loading) return (
        <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={P} />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>

            {/* 1. Page Header — white bar, always at top */}
            <View style={s.headerContainer}>
                <View style={s.header}>
                    <Text style={s.title}>Page Title</Text>
                    {/* Optional right-side CTA */}
                </View>
            </View>

            {/* 2. Scrollable Content */}
            <View style={{ flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
                <ScrollView
                    contentContainerStyle={{ padding: 20, paddingBottom: 52 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchData(); }}
                            colors={[P]}
                            tintColor={P}
                        />
                    }
                >
                    {/* Cards go here */}
                </ScrollView>
            </View>

        </View>
    );
}

const s = StyleSheet.create({
    headerContainer: {
        backgroundColor: CARD,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        paddingHorizontal: 24,
        paddingVertical: 16,
        zIndex: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 1280,
        width: '100%',
        alignSelf: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: TEXT,
        fontFamily: 'Quicksand',
    },
});
```

### Two-Column Desktop Grid

For pages that need a main column and a sidebar panel:
```tsx
{isDesktop ? (
    <View style={{ flexDirection: 'row', gap: 24 }}>
        <View style={{ flex: 0.65 }}>{/* Main content */}</View>
        <View style={{ flex: 0.35 }}>{/* Side panel */}</View>
    </View>
) : (
    <>
        {/* Stacked on mobile */}
    </>
)}
```

---

## 7. Core Components

### Card

The main content container. Use for all grouped content sections.

```typescript
card: {
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
}
```

**Card Header** (title left + action right):
```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
    <Text style={{ fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' }}>Title</Text>
    <TouchableOpacity onPress={...}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: P, fontFamily: 'Quicksand' }}>View All</Text>
    </TouchableOpacity>
</View>
```

### Stat Card

Used for key metric display (Revenue, Orders, Earnings, etc.):

```typescript
statCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 20,
    flex: 1,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: BORDER,
}

// Icon container:
statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }
// Icon background = color + '18' (e.g. '#B3697918')
```

### Primary Button

```typescript
primaryBtn: {
    backgroundColor: P,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
}
primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' }
```

### Outline / Destructive Button

```typescript
outlineBtn: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: RED,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
}
outlineBtnText: { color: RED, fontWeight: '600', fontSize: 14, fontFamily: 'Quicksand' }
```

### Chip / Filter Tab

Active and inactive states:
```tsx
// Container
<View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
    {['ALL', 'PENDING', 'COMPLETED'].map(tab => (
        <TouchableOpacity
            key={tab}
            onPress={() => setFilter(tab)}
            style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: filter === tab ? P_LIGHT : BG,
            }}
        >
            <Text style={{
                fontSize: 13,
                fontWeight: '700',
                fontFamily: 'Quicksand',
                color: filter === tab ? P : SUB,
            }}>
                {tab}
            </Text>
        </TouchableOpacity>
    ))}
</View>
```

### Section Label (above a card group)

```tsx
<Text style={{
    fontSize: 12,
    fontWeight: '600',
    color: SUB,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
    fontFamily: 'Quicksand',
}}>
    Section Name
</Text>
```

### Empty State

```tsx
<Text style={{
    fontSize: 13,
    color: SUB,
    fontFamily: 'Quicksand',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
}}>
    No data yet.
</Text>
```

### List Row (for history/review items)

```typescript
listRow: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
}
```

### Gradient Hero Card

Used on the Earnings page. Import from `expo-linear-gradient`:
```tsx
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
    colors={['#B36979', '#8F4A5A']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={{ borderRadius: 24, padding: 24 }}
>
    <Text style={{ color: 'white', ... }}>...</Text>
</LinearGradient>
```

---

## 8. Notification Badges

### Unread Count (red pill)
```typescript
{ backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }
// Text: { fontSize: 10, fontWeight: '700', color: 'white', fontFamily: 'Quicksand' }
```

### Warning Count (amber triangle)
```typescript
{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 4 }
// Text: { fontSize: 10, fontWeight: '700', color: '#D97706', fontFamily: 'Quicksand' }
```

---

## 9. Available Shared Components

Reuse these — don't rebuild them:

| Component | Path | Usage |
|---|---|---|
| `Tooltip` | `@/components/ui/Tooltip` | Hover info popover on icons |
| `InfoBox` | `@/components/ui/InfoBox` | Dismissible info/warning/error/success banners |
| `DropdownMenu` | `@/components/ui/DropdownMenu` | Dropdown menus (user avatar, action menus) |
| `DashboardSidebar` | `@/components/dashboard/DashboardSidebar` | Auto-injected via `_layout.tsx` |

**Tooltip:**
```tsx
<Tooltip content="Explanation text here." iconColor={P} iconSize={18} position="right" />
```

**InfoBox:**
```tsx
<InfoBox message="Something to note." type="info" dismissible={true} />
// type options: 'info' | 'warning' | 'error' | 'success'
```

---

## 10. Icon Library

Use **`lucide-react-native`** exclusively on all new pages. Do not mix with Ionicons.
(Ionicons exists only in legacy components.)

| Icon | Use |
|---|---|
| `LayoutDashboard` | Dashboard home |
| `Package` | Products |
| `ShoppingBag` | Orders |
| `DollarSign` | Revenue / earnings |
| `Bell` | Notifications |
| `Star` | Reviews / ratings |
| `TrendingUp` / `TrendingDown` | Trend indicators |
| `CheckCircle` | Completed / success |
| `Clock` | Pending / time |
| `XCircle` | Cancelled / error |
| `Settings` | Settings |
| `ArrowUpCircle` | Withdraw / upload action |
| `ChevronRight` | Navigation arrow |
| `RefreshCw` | Retry/reload |

---

## 11. Typography Scale

| Use | Size | Weight | Color |
|---|---|---|---|
| Page title | 24 | 700 | `TEXT` |
| Section heading | 20 | 700 | `TEXT` |
| Card title | 16 | 700 | `TEXT` |
| Large stat value | 24 | 800 | `TEXT` |
| Body / row item title | 14–15 | 600 | `TEXT` |
| Secondary label | 13 | 500–600 | `SUB` |
| Helper / timestamp | 11–12 | 400–500 | `SUB` |
| Sidebar section label | 11 | 700 | `#9CA3AF` + uppercase |
| Button label | 14 | 700 | `white` or `P` |

---

## 12. Data Formatting Conventions

Always use these exact patterns:

```typescript
// Full currency
const fmt = (n: number) =>
    `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Compact currency (for chart labels, tight spaces)
const fmtK = (n: number) =>
    n >= 1000 ? `₱${(n / 1000).toFixed(1)}k` : `₱${n.toFixed(0)}`;

// Short date (for list items)
new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// Long date (for page headers)
new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
```

---

## 13. New Dashboard Page Checklist

When creating a new seller dashboard page, verify every item:

- [ ] Color constants (`P`, `P_LIGHT`, `BG`, `CARD`, `TEXT`, `SUB`, `BORDER`, etc.) defined at the top of the file
- [ ] `fontFamily: 'Quicksand'` on every `<Text>` — no exceptions
- [ ] Page follows the **Page Structure Template** (header bar + `maxWidth` scroll container)
- [ ] Cards use `borderRadius: 24`, `padding: 24`, standard shadow
- [ ] Loading state: `ActivityIndicator` with `color={P}`
- [ ] Pull-to-refresh: `RefreshControl` with `colors={[P]}` and `tintColor={P}`
- [ ] Currency formatted with `₱` and `en-PH` locale
- [ ] Icons are from `lucide-react-native`
- [ ] Content wrapped in `maxWidth: 1280, alignSelf: 'center'` block
- [ ] Auth guard present (or confirmed that `_layout.tsx` guard is sufficient)
- [ ] Empty state uses `fontStyle: 'italic'`, `color: SUB`, centered text
