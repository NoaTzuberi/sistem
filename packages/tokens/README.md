# @sistem/tokens

The design values of both apps (PRD §12). Apps import only `@sistem/tokens/tokens.css`; it `@import`s the rest in cascade order.

```
tokens.css            entry: @imports only, in order (base → semantic → components → domains)
base/                 raw values
  palette.css         brand colors, neutrals, the solid / tint / ink contrast pairs
  typography.css      font families (per language), type scale, weights, line heights
  spacing.css         space scale, radii, corner cuts (+ RTL), border widths
  elevation.css       shadows, rings, blurs, opacity, z-index
  motion.css          durations, easings, press scales
  layout.css          breakpoints, touch target, sidebar / drawer / dock, safe areas (+ RTL)
semantic/             what a value means: surfaces.css, text.css, states.css
components/           tokens owned by one shared component: controls, sheets, slide
domains/              one screen family each: auth, onboarding, first-run, home, workouts, exercises,
                      cardio, nutrition, body, achievements, profile, coach, dashboard
brand/                logo files
```

## Where does a new token go?

1. A raw color, size step or duration that many things share → `base/`.
2. A name for a role ("the card", "faint text", "warning") built from base values → `semantic/`.
3. Used by one shared component (a button, sheet, segmented control) → `components/`.
4. Used by one screen family → its file in `domains/` (one token of a shared idea still goes in base / semantic).

Keep the file's order: add a token next to its relatives, under the right section comment. Each name is defined
once (`--color-on-ink-muted`, `--text-coach-name` and `--size-coach-avatar` are older exceptions: the later
definition wins). English overrides (`:root:lang(en)`) and RTL overrides sit at the end of the file they belong to.

After moving tokens between files, run `npm run check:tokens`: it fails if any resolved value differs from HEAD.
