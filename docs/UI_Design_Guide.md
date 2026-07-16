# Odigma One — UI Design Guide

This guide defines the visual language for Odigma One (web + mobile).
All values become design tokens (CSS variables / Tailwind theme) in
`shared/` so web and mobile stay consistent.

------------------------------------------------------------------------

## 1. Brand

- **Primary (Odigma Orange):** `#f26222`
- **Dark base:** `#171717`
- **Logo:** `docs/brand/odigma-logo.png` (orange wordmark + lightbulb icon)

## 2. Design Direction

Based on approved references (July 2026):

- **Light (white) theme is the default on both desktop and mobile.**
  Dark theme (`#171717` base) is available as a user toggle.
- **Desktop web:** warm-white canvas, white elevated cards with soft
  shadows, stat cards with mini-charts, pill buttons, clean collapsible
  sidebar — card layout/structure follows the approved dashboard
  reference.
- **Mobile app:** same light language — soft rounded cards, large
  numbers, orange hero card, pill action buttons, avatar-led list rows.
- Overall personality: **colorful & friendly** — colored status /
  priority chips, friendly empty states — on a clean white canvas, with
  orange reserved for the primary action and active navigation.

## 3. Color Tokens

### Core palette

| Token | Light theme (default) | Dark theme (toggle) |
|---|---|---|
| `background` | `#f6f4f1` | `#171717` |
| `surface` (cards) | `#ffffff` | `#1f1e1c` |
| `surface-raised` | `#f3f0ea` | `#26241f` |
| `border` | `#e5e0d8` | `#2e2c28` |
| `foreground` | `#1d1c1a` | `#f7f5f2` |
| `muted-foreground` | `#6f6a62` | `#a39e96` |
| `primary` | `#f26222` | `#f26222` |
| `primary-foreground` | `#ffffff` | `#ffffff` |
| `primary-glow` | `#f2622233` (20% alpha) | `#f2622259` (35% alpha) |

Neutrals carry a slight warm bias toward the orange accent (not pure
grey) so the whole UI feels cohesive.

### Status colors (tasks)

| Status | Color |
|---|---|
| To Do | `#94a3b8` (slate) |
| In Progress | `#3b82f6` (blue) |
| In Review | `#a855f7` (purple) |
| Blocked | `#ef4444` (red) |
| Done | `#22c55e` (green) |

### Priority colors

| Priority | Color |
|---|---|
| Low | `#94a3b8` |
| Medium | `#eab308` |
| High | `#f97316` |
| Urgent | `#ef4444` |

Chips use the color at ~15% alpha for background, full color for text/dot.

## 4. Typography

- **Font:** Inter (web) / system + Inter (mobile)
- Numbers on stat cards use `font-variant-numeric: tabular-nums`
- Scale: 12 (caption) / 14 (body) / 16 (emphasis) / 20 (card title) /
  28–32 (page title / big stats)

## 5. Shape & Elevation

- **Radius:** 12px cards, 10px inputs, 9999px (pill) buttons & chips
- **Light theme elevation (default):** white cards, soft shadows
  (`0 1px 3px rgb(23 23 23 / 5%)`), subtle warm borders; orange glow
  (`primary-glow`) only on primary CTAs and active nav item
- **Dark theme elevation:** lighter surface + 1px border (`#2e2c28`),
  no heavy shadows

## 6. App Shell

- Collapsible sidebar (icons + labels), grouped nav, active item gets
  orange accent bar + tinted background
- Top bar: breadcrumbs, global search (Ctrl+K command palette),
  notification bell with unread badge, avatar menu
- Client role sees a reduced sidebar (permission-driven)

## 7. Components & Patterns

- **shadcn/ui** components restyled with the tokens above
- **Tables:** TanStack Table — sorting, filters, column visibility,
  pagination, bulk select; row hover reveals quick actions; inline edit
  for status / priority / assignee
- **Kanban:** dnd-kit, optimistic drag, column headers show count chips
- **Charts:** Recharts, minimal axes, orange as the primary series color
- **Forms:** React Hook Form + Zod, inline validation, disabled submit
  while saving
- **Feedback:** skeleton loaders (never spinners for page loads), toast
  for every action result, confirmation dialog for destructive actions
- **Empty states:** icon + one-line explanation + CTA button, always
- **Avatars:** image with colored-initials fallback
- **Dates:** relative ("2 hours ago") with absolute on hover

## 8. Responsive & Accessibility

- Sidebar → drawer under `lg`; tables → card lists under `md`
- All interactive elements keyboard-reachable; WCAG AA contrast
  (orange on dark passes for large text/buttons; body text uses
  `foreground`, never orange)
- Mobile (Expo) uses the same token names via a shared theme file
