# Pricing & Calculation Notes

Domain knowledge captured while implementing coating/hardware-quantity/rubber/brush
costing (see `prisma/schema.prisma`, `src/utils/sectionConfig.ts`,
`src/app/quotations/create/QuotationBuilder.tsx`). This is the "why" behind the
formulas — the code is the source of truth for current behavior, this file is
for understanding the fabrication logic behind it and for extending it later.

## Units

**1 inch = 8 dora.** "Dora" is a trade sub-unit of the inch used for fine
deductions. Always convert to inches (or straight to mm, since the app stores
all deductions in mm) before entering a value: `inches = whole_inches + dora/8`,
`mm = inches × 25.4`.

## The base fabrication formula (2-track sliding window, all-glass)

Given a window of outer width `W` and height `H` (mm), quantity `qty`:

| Quantity | Formula | Where it lives |
|---|---|---|
| Shutter width | `W / 2` (no further deduction for this profile) | `shutterWidthDeduction = 0` on `SectionConfiguration` |
| Shutter height | `H − 2¾"` (2" + 6 dora = 2.75" = 69.85mm) | `heightDeduction` on `SectionConfiguration` |
| Glass width | `shutterWidth − 4⅛"` (4" + 1 dora = 4.125" = 104.775mm) | `glassWidthDeduction` |
| Glass height | `shutterHeight − 4⅛"` | `glassHeightDeduction` |

These constants are **per (SectionType × trackType × configuration)** —
different aluminum systems (profile widths/series) have different deduction
values. The numbers above are one real 2-track example, not a universal
constant — always re-derive per system using the "Derive from example" tool
in `/admin/sections`, or compute by hand as above.

Formula implementation: `src/utils/sectionConfig.ts` (`getSectionConfig()` →
`calculateFinalDimensions`, `calculateGlassSize`).

## Material costing

- **Profile (aluminium)**: costed as `ft-of-stock-used × ₹/ft`. Stock length is
  optimized (cutting/wastage) by `src/utils/stockOptimization.ts` before this
  rate is applied. Categories: frame, shutter, interlock, track rail, mullion
  — each can have its own ₹/ft rate (`RateCard.profileRates`) or fall back to
  a default (`RateCard.profileRatePerFt`).
- **Profile weight** (`RateCard.profileWeightPerFt`, kg per ft, per category)
  is a *separate* fact from the ₹/ft rate — it exists only to drive coating
  cost, not material cost. Example real values: Frame 3.1kg/16ft (=0.19375
  kg/ft), Shutter 3.2kg/16ft (=0.2 kg/ft), Interlock 1.2kg/16ft (=0.075 kg/ft).
  Track rail / mullion weight is typically 0 unless those members are also
  coated.
- **Coating**: `totalWeightKg = Σ(category ft × kg/ft)`, then
  `billedWeightKg = totalWeightKg × (1 + wastage% / 100)`,
  `cost = billedWeightKg × ₹/kg`. Real example: wastage 4% (100kg of material
  becomes 104kg billed after the coating process), rate ₹55/kg. Wastage % and
  ₹/kg are **quote-wide**, not per aluminum system (unlike profile weight,
  which IS per system/category) — editable in the "Coating" card at the top
  of the Rates & Sections step, seeded from `RateCard.coatingRatePerKg` /
  `RateCard.coatingWastagePercent` (default 4%).
- **Glass**: `area(sqft) × ₹/sqft`, rate keyed by a free-text label (thickness/
  type) in `RateCard.glassRates`. Example: "Clear Glass 4mm" → ₹48/sqft.
- **Rubber**: rides on the *same sqft as glass* (not shutter or window sqft),
  `RateCard.rubberRatePerSqft`. Example: ₹8/sqft.
- **Brush**: rides on *window sqft* (the whole opening, not glass/shutter),
  `RateCard.brushRatePerSqft`. Example: ₹2/sqft. This is different from
  Rubber's area basis — don't conflate the two when adding new per-sqft costs.

## Hardware quantities (per window, not per sqft)

These are **counts**, configured per (SectionType × trackType × configuration)
on `SectionConfiguration`, multiplied by window quantity. Rates come from
`RateCard.hardwareRates` (free-form label→rate map) matched by the exact
labels in `src/utils/hardwareRates.ts` (`LOCK_LABEL`, `BEARING_LABEL`,
`CORNER_LABEL`, `PVC_CONNECTOR_LABEL`, `MALE_FEMALE_CAP_LABEL`).

Real 2-track, 2-glass example:

| Item | Count / window | Rate | Track-type sensitivity |
|---|---|---|---|
| Lock | 2 | ₹120 | none observed |
| Bearing | 4 (2-track) / 6 (3-track) | ₹30 | **yes** — only hardware count that's known to vary by track type |
| Corner | 12 (for 2 glass, 2-track) | ₹15 | likely varies with glass-panel count, not confirmed for 3-track |
| PVC Connector (Kuniya) | 16 | ₹0.80 | not confirmed for 3-track |
| Male-Female Cap | 4 | ₹2 | not confirmed for 3-track |

Only Bearing's 3-track value is confirmed; the others are recorded as
"unconfirmed for 3-track" — don't assume they're the same without checking
with the user before entering 3-track defaults.

## Labour & overhead

- **Labour**: ₹/sqft of total window area (`RateCard.laborRatePerSqft`,
  `laborMode = "perSqft"`). Example: ₹35/sqft.
- **"Miscellaneous / Rehva Dyo"**: a flat, whole-quotation add-on
  (₹1000 in the example), **not** per-window — mapped to
  `RateCard.overheadDefault` / the quotation's Overhead field, not to any
  hardware-count mechanism. If a future request wants a per-window misc
  charge, that's a different (currently unbuilt) mechanism — don't reuse
  Overhead for it.

## Scope boundary: worksheet sections vs. manual sections

Coating, hardware auto-quantities, and profile-weight costing **only apply to
worksheet-based sections** (the ones with a real `SectionConfiguration` and a
computed per-category material list). Manual sections (`ManualSectionForm`,
no worksheet) only get Rubber and Brush (pure `area × rate`, no weight/count
data available) — they use a flat `area × frameRatePerSqft` for "profile"
cost with no per-category breakdown to derive weight or hardware counts from.

## Gotchas hit while building this

- **`find(a => a.area)` is not a safe way to detect "the mesh line"** once
  more than one accessory can carry an `area` (Brush now does too). Match on
  name (`a.name.toLowerCase().includes("mesh")`) instead. Two places had this
  bug: `QuotationDocument.tsx` (display) and `QuotationBuilder.tsx`
  (`buildInitialSectionTypeRates`, restoring saved rates).
- **Stale `@prisma/client` in a running dev server.** After
  `prisma db push`/`migrate`, the client on disk is correct immediately, but
  a dev server process started *before* the regeneration keeps the old client
  in its module cache and throws `Unknown argument` errors for new fields.
  Restart the dev server after any schema change — don't debug the schema
  first.
- **Coating's rate/wastage were initially wired to the global `RateCard`
  only**, with no per-quotation override — inconsistent with Lock/Bearing/
  Mesh/Track Cap, which are all editable per quotation via `SectionTypeRates`.
  Fixed by adding dedicated `coatingRatePerKg`/`coatingWastagePercent`
  component state, editable in a "Coating" card, restored on edit from the
  saved "Coating" line's `rate` field (wastage % isn't separately recoverable
  from a saved line since it's baked into the billed weight — falls back to
  the Rate Card default on edit).
