---
name: Merydian
description: A trip as a printed timetable; every revision is a correction printed in the margin.
colors:
  ground: "#f2f4f6"
  panel: "#f7f8fa"
  paper: "#ffffff"
  ink: "#14181d"
  ink-2: "#39424c"
  ink-3: "#56606c"
  rule: "#c9cfd6"
  cyan: "#17407f"
  green: "#1f6b35"
  magenta: "#c4231a"
  yellow: "#8a5a00"
  navy-tint: "#e8eef8"
  green-tint: "#e5f2e9"
  red-tint: "#fbebe9"
  amber-tint: "#fbf1d9"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.012em"
  body:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  table-head:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.04em"
rounded:
  sm: "2px"
  md: "2px"
  lg: "3px"
spacing:
  cell-x: "12px"
  cell-y: "9.6px"
  button-x: "16px"
components:
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 16px"
  button-ink-hover:
    backgroundColor: "{colors.ink-2}"
  button-action:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    height: "48px"
    padding: "0 24px"
  button-action-hover:
    backgroundColor: "{colors.ink}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 16px"
  tag-added:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.green}"
    rounded: "{rounded.sm}"
    height: "24px"
    padding: "0 8px"
  tag-removed:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.magenta}"
    rounded: "{rounded.sm}"
    height: "24px"
    padding: "0 8px"
  tag-pending:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.yellow}"
    rounded: "{rounded.sm}"
    height: "24px"
    padding: "0 8px"
  tag-ai:
    backgroundColor: "{colors.navy-tint}"
    textColor: "{colors.cyan}"
    rounded: "{rounded.sm}"
    height: "24px"
    padding: "0 8px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
---

# Design System: Merydian

## Overview

**Creative North Star: "The Printed Timetable"**

A trip is read like a Kursbuch page: white paper on a pale cool ground, ruled columns of times and stops, ink type, and every revision shown as a correction in the margin rather than a highlight. The system is flat, near-square and typographic. Colour is scarce and always carries meaning; nothing is decorative.

Density is that of a reference table: tabular numerals for every time and amount, hairline rules between rows, a 2px ink rule under table headers. Photographs appear only as small framed plates with captions and credits; maps are real OpenStreetMap insets. The chosen version of a plan is drawn solid, earlier versions dashed.

The earlier colour-bar poster look and soft-card travel app look are rejected. The token names `cyan`, `green`, `magenta`, `yellow` survive from the old system but now hold navy, forest, red and amber.

**Key Characteristics:**
- White paper (#ffffff) on pale ground; ink text; hairline rules.
- Four signals, each with one meaning; tinted fills only on stamps and alerts.
- 2-3px corners, no shadows at rest.
- One typeface (Archivo, weight 700 for headings, normal width), tabular numerals globally.
- Emphasis by underline, never by highlight.

## Colors

Cool paper and ink with four restrained signal colours.

### Primary
- **Timetable Navy** (`cyan`): action and AI. Action buttons, focus ring (2px, 2px offset), AI tags, default `.mark` underline, loading bar.

### Secondary
- **Forest** (`green`): added or approved. Added-stop bars and tags.
- **Timetable Red** (`magenta`): withdrawn or needs attention. Withdrawn items (dashed), error notes.
- **Amber** (`yellow`): pending, and shifted. Pending tags.

### Neutral
- **Cool Ground** (`ground`): page background and scrollbar track.
- **Panel Grey** (`panel`): table row hover.
- **Paper** (`paper`): every panel, plate, input, outline button.
- **Ink** (`ink`): text, 2px table-header rules, ink buttons. `ink-2` secondary text, `ink-3` labels and placeholders.
- **Hairline** (`rule`): 1px borders and row dividers.
- **Tints** (`navy-tint`, `green-tint`, `red-tint`, `amber-tint`): backgrounds for tags and alerts matching their signal.

### Named Rules
**The Signal Meaning Rule.** Navy, forest, red and amber each mean exactly one thing (action/AI, added/approved, withdrawn/attention, pending). Never use them as decoration or for brand flavour.

**The Correction Rule.** A revision is shown by tone, tag and dashed-versus-solid drawing, not by a highlight fill behind running text.

## Typography

**Display Font:** Archivo Variable (with Archivo, system-ui, sans-serif)
**Body Font:** the same
**Label/Mono Font:** none; tabular numerals on the body face.

**Character:** A plain grotesque set heavy and tight for titles, quiet at body size, like a timetable's cover and its columns.

### Hierarchy
- **Display** (700, up to 3.5rem, 1.02, -0.02em): landing headline.
- **Title** (700, 2.25rem to 3rem on page headers, 1.1, -0.012em): page headers; smaller titles (1.5rem) for empty states and sections.
- **Body** (400, 1rem, 1.5): prose capped around 56-62ch.
- **Table head** (600, 0.75rem, 0.04em, uppercase): `.ruled` column headings only.
- **Caption** (0.6875rem): plate captions and photo credits.

### Named Rules
**The Tabular Rule.** Every time, price and count uses tabular numerals; right-align numbers with the `.num` treatment.

## Layout

Page ground with paper panels laid on a column grid; the landing fold is a 7/5 split (headline and actions left, plate over map right) with a full-width ruled day table beneath. Content is tables and ruled panels, never nested cards. Table cells use 12px horizontal and about 10px vertical padding; buttons are 40px (md) or 48px (lg) high. Panels are not nested inside panels.

## Elevation & Depth

Flat. Depth comes from 1px rules, a 2px ink rule under headers and paper-on-ground contrast. `--shadow-card` is none. A `shadow-lift` token exists (`0 1px 0 rgb(20 24 29 / 0.06), 0 8px 24px rgb(20 24 29 / 0.10)`) for rare overlay use only.

### Named Rules
**The Flat Rule.** Nothing carries a shadow at rest.

## Shapes

Near-square: 2px on buttons and tags, 3px on panels and plates. Pills stay `rounded-full` where used. Borders are 1px `rule`; a 1px dashed border marks empty states and withdrawn items. Plates are a 1px frame with 6px paper padding around the image.

## Components

### Buttons
- **Shape:** 2px corners, semibold, colour-only hover (150ms).
- **Ink:** ink fill, paper text; hover ink-2. **Action:** navy fill, hover ink. **Outline:** paper with 1px ink border, hover panel grey. **Quiet:** text with ink underline that thickens on hover.
- Disabled: rule-grey fill, ink-2 text.

### Tags
Stamped 24px labels: 1px border in the signal colour, tint fill, bold 12px text. Tones: added, removed, shifted/pending, ai, neutral.

### Panels
Paper fill, 1px rule border, no shadow. Empty states use a dashed ink-3 border.

### Inputs / Fields
Paper fill, ruled edge, the shared navy 2px focus outline. Errors use the red note: red border, red-tint fill, red bold text.

### Ruled Table (signature)
`.ruled`: collapsed borders, uppercase 12px ink-3 headings on a 2px ink bottom rule, rows on 1px hairlines, panel-grey row hover, tabular numerals. Calendars (`features/calendar/MonthGrid.tsx`) and day timelines follow the same ruling.

### Mark (signature)
`.mark` is a 0.07em underline in a signal colour (`mark-cyan/green/magenta/yellow`) for inline emphasis.

### Plate and Map
`Plate` presents a photograph in a thin frame with place name caption and a licence credit line; every shipped photograph carries its credit. The map is a Leaflet/OpenStreetMap inset (`features/plan/TripMap.tsx`). Chosen version solid, earlier versions dashed.

### Motion
GSAP in `src/lib/motion.ts` (expo/power3 out entrances, staggered fade/rise, clip-path unmask on plates), reduced-motion gated; CSS `snap-in` (420ms) and `fill-x` (700ms) share `--ease-snap`, disabled under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** keep emphasis to underlines, rules and tags.
- **Do** draw withdrawn or earlier-version items dashed and chosen items solid.
- **Do** credit every photograph and caption it as a plate.
- **Do** keep numerals tabular and right-aligned in tables.

### Don't:
- **Don't** add shadows, gradients or rounded corners above 3px to panels.
- **Don't** use colour bars or tinted bands as decoration; `Bands` is a deliberate no-op kept only so old callers compile.
- **Don't** use a signal colour for anything but its meaning.
- **Don't** nest panels or build soft travel-app cards.
