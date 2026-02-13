# Copilot Instructions — plugaishop-app (2026)

## Objective
This repository is the Plugaí Shop mobile app built with Expo + Expo Router + TypeScript. Generate production-grade code with minimal churn, prioritizing incremental improvements only.

## Non-negotiables
- DO NOT redesign UI/layout. Layout is approved and must be preserved.
- Prefer incremental functional improvements; never restart the project.
- Keep the bottom tab bar fixed and always available.
- Ensure a consistent “Back/Home” access on screens that are not tabs, without breaking layout.
- Always output complete, ready-to-paste files when modifying code.

## Project structure (root)
- Root folders: `app/`, `assets/`, `components/`, `constants/`, `context/`, `data/`, `hooks/`, `scripts/`, `utils/`.
- `components/` is ONLY at the project root (same level as `app/`).

## Import rules (strict)
### Theme
- `constants/theme.ts` MUST export:
  - `export default theme`
  - named exports: `Colors`, `Radius`, `Spacing`
- Always import as:
  - `import theme from "../../constants/theme";` (or correct relative path)
  - `import { Colors, Radius, Spacing } from "../../constants/theme";`
- Avoid `src/constants/...` paths.
- Avoid `import { theme } ...`.

### ProductCardVertical
- Must use:
  - `import { Colors, Radius, Spacing } from "../../constants/theme";`
  - `import type { Product } from "../../data/catalog";`

### AppHeader pathing
- From screens inside `app/(tabs)/*`:
  - `import AppHeader from "../../components/AppHeader";`
- From `app/_layout.tsx`:
  - `import AppHeader from "../components/AppHeader";`

## Home banner path (strict)
- `app/(tabs)/index.tsx` must always use:
  - `source={require("../../assets/banners/banner-home.png")}`

## Typography behavior (approved)
- Explore > Main Categories:
  - Names with spaces can wrap up to 2 lines.
  - Single-word long names must stay on 1 line using `adjustsFontSizeToFit` + `minimumFontScale`.
  - Keep centered; do not change this section’s layout.

## Tabs navigation
- Keep tabs stable and fixed.
- Minimal changes only; do not rename routes unless explicitly required.

## Code quality
- TypeScript strictness: avoid `any`, avoid unsafe casts.
- Prefer small, targeted diffs.
- Keep functions/components readable and cohesive.
- Handle edge cases (null/undefined, empty states) without visual redesign.

## Deliverables
When asked to fix something:
- Provide the full updated file(s), not snippets.
- Ensure imports and paths match the repository structure.
- Do not introduce new dependencies unless requested and justified.
