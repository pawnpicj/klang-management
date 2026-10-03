# Brand template integration QA

Date: 2026-10-03 (Asia/Bangkok)

final result: passed

Scope: integrate all three selected brand directions into the existing application as switchable appearance templates, independently of Light/Dark. This is a brand-system adaptation, not a pixel-for-pixel rebuild of the illustrative board dashboards.

## Evidence

Sources: ../klang-brand-direction/01-teal-command.png, 02-emerald-collective.png, 03-graphite-signal.png.
Actual captures: test-results/brand-templates/{template}-{light|dark}.png, mobile-selector.png, mobile-login.png.
Source boards 1488x1056; desktop captures 1440x1024, device scale 1; mobile captures 375x812. Source and corresponding implementation were inspected together. Compare product colors, surfaces and hierarchy rather than the board's editorial layout. Tables, header and selector are readable in the captures; no additional region crop needed.

## Required fidelity surfaces

- Typography: readable Thai/Latin system stacks, differentiated Emerald Segoe UI/Tahoma and Graphite uppercase tracked wordmark; tabular numeric tables. P3: concept boards name Inter, while production uses local system fonts. No font download dependency added.
- Spacing/layout: preserve working app structure and features; template-specific section/control/navigation radii. Desktop table and mobile selector fit; horizontal table scrolling remains contained. Concept-only sidebars, avatars and fabricated navigation are intentionally omitted.
- Colors: all six combinations apply the expected backgrounds. Teal retains navy/mint, Emerald uses forest/cream/sage, Graphite uses graphite/mint/cyan. Graphite Light primary is darkened for readable white button text. Header/table surfaces distinguish each template.
- Assets: existing supplied warehouse logo remains sharp and recognizable. No generated board screenshot is used as application UI. P3: Emerald retains the existing full-color mark rather than a monochrome logo variant.
- Copy: live Thai app content and configured public fields remain authoritative; no mock board data or slogans inserted into user flows.

## Functional checks

Seven unit tests passed (appearance initialization/fallback and public-preview rendering).
Typecheck, final build and lint of changed TypeScript/React files passed.
Playwright passed all six template/mode combinations, reload persistence, navigation persistence, cross-tab updates, mobile document overflow, selector opening and Escape dismissal; no page errors.
Public Preview and login were inspected. Authenticated dashboard workflows were not exercised; their shared header/navigation styling is applied through existing components.

No unresolved P0/P1/P2 issues within this integration scope. Optional P3 refinements: bundled Inter/Thai fonts and a separate monochrome Emerald logo.

## Clan/Gang card follow-up

Replaced hard-coded sky/violet card/icon/badge colors with selected brand tokens; Open primary, Edit outline, Delete destructive outline. Heading is now Clan/Gang. Preserved existing archive confirmation and permissions.

Build and changed-file lint passed. Playwright fixture uses the actual card JSX and actual ArchiveClanButton with mocked server actions: all six appearance surfaces, transparent deletion button, cancellation/confirmation and mobile document fit passed. Evidence: test-results/clan-card-check/*.png. Compared supplied screenshot with new Emerald Dark card. Fixture is not an authenticated end-to-end archive test; no real data was deleted. Frame sizes differ from the supplied zoomed full-page image, so the comparison assesses palette and action hierarchy only. No unresolved P0/P1/P2 findings for this change.
