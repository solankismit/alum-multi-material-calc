/**
 * Unit conversion tests — run with:  npx tsx scripts/test-units.ts
 *
 * Covers the inch+dora parser in particular, which has two genuinely tricky
 * cases: a leading minus must read as a negative number rather than the
 * inch/dora separator, and inch+dora display is lossy for values that are not
 * whole dora multiples (1000mm shows as 39-3, i.e. 997.7mm).
 */

import { parseLength, formatLength, parseInchDora, formatInchDora, isLossyInUnit, MM_PER_DORA } from "../src/utils/units";

let fail = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = typeof got === "number" && typeof want === "number"
    ? Math.abs(got - want) < 1e-9 : got === want;
  if (!ok) { fail++; console.log(`  FAIL ${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
  else console.log(`  ok   ${label}: ${JSON.stringify(got)}`);
};

console.log("=== the confirmed requirement: both spellings, same value ===");
eq('parse "47-3"',    parseInchDora("47-3"),   47 * 25.4 + 3 * MM_PER_DORA);
eq('parse "47 3"',    parseInchDora("47 3"),   47 * 25.4 + 3 * MM_PER_DORA);
eq('parse "47.375"',  parseInchDora("47.375"), 47.375 * 25.4);
eq('"47-3" == "47.375"', parseInchDora("47-3") === parseInchDora("47.375"), true);
eq('parse "47"',      parseInchDora("47"),     47 * 25.4);

console.log("\n=== the deduction values from the real formulas ===");
eq('2" 6 dora -> mm',  parseInchDora("2-6"),  69.85);
eq('4" 1 dora -> mm',  parseInchDora("4-1"),  104.775);
eq('format 69.85',     formatInchDora(69.85),  "2-6");
eq('format 104.775',   formatInchDora(104.775),"4-1");
eq('format 3.175 (1 dora)', formatInchDora(3.175), "0-1");

console.log("\n=== negatives are numbers, not separators ===");
eq('parse "-5"',    parseInchDora("-5"),   -5 * 25.4);
eq('parse "-2-4"',  parseInchDora("-2-4"), -(2 * 25.4 + 4 * MM_PER_DORA));
eq('format -69.85', formatInchDora(-69.85), "-2-6");

console.log("\n=== round-trips ===");
for (const mm of [69.85, 104.775, 1203.325, 3.175, 0]) {
  eq(`roundtrip ${mm}`, parseInchDora(formatInchDora(mm)), mm);
}
eq('carry: 7.9 dora rounds to 1 inch', formatInchDora(7.9 * MM_PER_DORA), "1");

console.log("\n=== other units ===");
eq('parse 2 ft',      parseLength("2", "ft"),    609.6);
eq('parse 21 dora',   parseLength("21", "dora"), 66.675);
eq('format 66.675 dora', formatLength(66.675, "dora"), "21");
eq('format 69.85 mm', formatLength(69.85, "mm"), "69.85");

console.log("\n=== lossiness is detected, not hidden ===");
eq('1000mm lossy in inDora', isLossyInUnit(1000, "inDora"), true);
eq('69.85mm exact in inDora', isLossyInUnit(69.85, "inDora"), false);
eq('1000mm not lossy in mm',  isLossyInUnit(1000, "mm"), false);
eq('format 1000 -> 39-3',     formatInchDora(1000), "39-3");

console.log("\n=== junk input ===");
for (const junk of ["", "abc", "4-", "-", "4-3-2", "--5"]) {
  eq(`parse ${JSON.stringify(junk)}`, parseInchDora(junk), null);
}

console.log(fail === 0 ? "\nALL PASS" : `\n${fail} FAILURE(S)`);
process.exit(fail === 0 ? 0 : 1);
