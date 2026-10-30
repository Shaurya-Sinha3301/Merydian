# Design System Migration

## Neumorphic CSS Deprecation
The prototype application utilized a heavy Neumorphic design language (`.neu-*` classes) stored primarily in `globals.css`. 

**Current Status:** Phase-out.
We are incrementally removing Neumorphic classes from newly refactored pages. The final goal is to completely delete `.neu-*` references once all legacy pages are migrated.

## Shadcn & Blueprint Standardization
The new standard leverages a cleaner, flatter, high-contrast aesthetic (Blueprint), augmented by Shadcn primitives.

### Typography
- Primary: `DM Sans` (Variables: `--font-dm-sans`)
- Serif Accent: `Crimson Text` (Variables: `--font-crimson-text`)
- Monospace: `JetBrains Mono` or similar for technical details.

### Color Palette
- **Brand Emerald**: The primary interactive color (`emerald-600` for buttons, `emerald-500` for active states).
- **Agent Blue**: Distinctive blue tones for the Agent workspace to separate it visually from the customer view.
- **Status Colors**: 
  - Emerald/Green (Success/Confirmed)
  - Amber/Yellow (Warnings/Time Changes/Limited)
  - Red (Failed/Removed)
  - Blue (Moved)
  - Purple (Hotel Changes)
