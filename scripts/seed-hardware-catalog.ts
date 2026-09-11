/**
 * Seeds the HardwareItem catalog and backfills the data that used to live in
 * the five fixed SectionConfiguration columns.
 *
 * Idempotent — safe to re-run. The second run reports 0 changes.
 *
 *   npx tsx scripts/seed-hardware-catalog.ts
 *
 * What it does:
 *  1. Upserts the default catalog items (by their stable `key`).
 *  2. For every SectionConfiguration, derives `hardwareCounts` from the legacy
 *     lockCount/bearingCount/cornerCount/connectorCount/capCount columns —
 *     but only when `hardwareCounts` is still empty, so a config already
 *     edited through the new UI is never overwritten.
 *  3. Re-keys each RateCard's hardwareRates entries onto catalog keys where
 *     the label identifies a catalog item, preserving the rate. Entries that
 *     match nothing are left alone (they remain valid per-user custom items)
 *     and are reported so nothing disappears silently.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import {
  DEFAULT_HARDWARE_ITEMS,
  LEGACY_HARDWARE_KEY_BY_FIELD,
  type HardwareCountMap,
} from "../src/utils/hardwareCatalog";
import { slugifyHardwareKey, type HardwareRateMap } from "../src/utils/hardwareRates";

const prisma = new PrismaClient();

const LEGACY_COUNT_FIELDS = [
  "lockCount",
  "bearingCount",
  "cornerCount",
  "connectorCount",
  "capCount",
] as const;

async function seedCatalog(): Promise<number> {
  let created = 0;

  for (const item of DEFAULT_HARDWARE_ITEMS) {
    const existing = await prisma.hardwareItem.findUnique({ where: { key: item.key } });
    if (existing) continue;

    // create (not upsert) so a label/unit an admin has since edited is never
    // reverted to the default on a re-run.
    await prisma.hardwareItem.create({ data: item });
    created += 1;
    console.log(`  + ${item.label} (${item.key})`);
  }

  console.log(`Catalog: ${created} created, ${DEFAULT_HARDWARE_ITEMS.length - created} already present.`);
  return created;
}

async function backfillCounts(): Promise<number> {
  const configs = await prisma.sectionConfiguration.findMany({
    include: { sectionType: { select: { name: true } } },
  });
  let updated = 0;

  for (const config of configs) {
    const already = config.hardwareCounts as HardwareCountMap | null;
    if (already && Object.keys(already).length > 0) continue; // already migrated or hand-edited

    const counts: HardwareCountMap = {};
    for (const field of LEGACY_COUNT_FIELDS) {
      const value = config[field];
      if (typeof value === "number" && value > 0) {
        counts[LEGACY_HARDWARE_KEY_BY_FIELD[field]] = value;
      }
    }

    if (Object.keys(counts).length === 0) continue; // nothing to carry over

    await prisma.sectionConfiguration.update({
      where: { id: config.id },
      data: { hardwareCounts: counts },
    });
    updated += 1;
    console.log(
      `  ~ ${config.sectionType.name} / ${config.trackType} / ${config.configuration}: ${JSON.stringify(counts)}`
    );
  }

  console.log(`Counts: ${updated} configuration(s) backfilled, ${configs.length - updated} unchanged.`);
  return updated;
}

async function rekeyRates(): Promise<{ updated: number; unmatched: string[] }> {
  const items = await prisma.hardwareItem.findMany();
  // Catalog lookup by the slug of its label, which is how a user's own entry
  // would have been keyed before the catalog existed.
  const catalogBySlug = new Map(items.map((i) => [slugifyHardwareKey(i.label), i]));
  const catalogKeys = new Set(items.map((i) => i.key));

  const rateCards = await prisma.rateCard.findMany();
  const unmatched: string[] = [];
  let updated = 0;

  for (const card of rateCards) {
    const rates = (card.hardwareRates ?? {}) as unknown as HardwareRateMap;
    const next: HardwareRateMap = {};
    let changed = false;

    for (const [key, entry] of Object.entries(rates)) {
      if (catalogKeys.has(key)) {
        next[key] = entry; // already on a catalog key
        continue;
      }

      const match = catalogBySlug.get(slugifyHardwareKey(entry.label));
      if (match && !rates[match.key]) {
        // Re-key onto the catalog, keeping the user's rate and their label.
        next[match.key] = entry;
        changed = true;
        console.log(`  ~ rate "${entry.label}": ${key} -> ${match.key}`);
      } else {
        next[key] = entry;
        if (!match) unmatched.push(entry.label);
      }
    }

    if (!changed) continue;

    await prisma.rateCard.update({
      where: { id: card.id },
      data: { hardwareRates: next as unknown as Prisma.InputJsonValue },
    });
    updated += 1;
  }

  console.log(`Rates: ${updated} rate card(s) re-keyed, ${rateCards.length - updated} unchanged.`);
  return { updated, unmatched };
}

async function main() {
  console.log("Seeding hardware catalog...");
  await seedCatalog();

  console.log("\nBackfilling per-window counts from legacy columns...");
  await backfillCounts();

  console.log("\nRe-keying rate cards onto catalog keys...");
  const { unmatched } = await rekeyRates();

  if (unmatched.length > 0) {
    const distinct = [...new Set(unmatched)];
    console.log(
      `\nNote: ${distinct.length} rate(s) match no catalog item and were left as-is ` +
        `(they still work as per-user custom items): ${distinct.join(", ")}`
    );
    console.log(
      "Add them in /admin/hardware if they should get per-window quantities too."
    );
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error("Error during hardware catalog seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
