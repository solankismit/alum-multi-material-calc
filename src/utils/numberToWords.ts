const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

/** Converts a 0-999 integer to words — the building block for every group
 * in the Indian lakh/crore numbering system below. */
function threeDigitsToWords(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ONES[n];
    if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
    return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? " " + threeDigitsToWords(n % 100) : ""}`;
}

/**
 * Indian numbering (lakh/crore groups), not the Western thousand/million
 * grouping most "number to words" packages assume — that mismatch is a
 * common source of bugs in generic libraries, which is why this is a small
 * local function instead of a dependency (see the plan's Decision Audit
 * Trail #6).
 */
function integerToWords(n: number): string {
    if (n === 0) return "Zero";

    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const rest = n % 1000;

    const parts: string[] = [];
    if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
    if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
    if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
    if (rest) parts.push(threeDigitsToWords(rest));

    return parts.join(" ");
}

/** e.g. 2690097.92 -> "Twenty Six Lakh Ninety Thousand Ninety Seven Rupees
 * and Ninety Two Paisa" — singular "Rupee" only for an exact amount of 1. */
export function amountInWords(rupees: number): string {
    const safeRupees = Math.max(0, rupees);
    const wholeRupees = Math.floor(safeRupees);
    const paise = Math.round((safeRupees - wholeRupees) * 100);

    const rupeeWord = wholeRupees === 1 ? "Rupee" : "Rupees";
    const rupeesPart = `${integerToWords(wholeRupees)} ${rupeeWord}`;

    if (paise === 0) return `${rupeesPart} Only`;

    const paiseWord = paise === 1 ? "Paisa" : "Paise";
    return `${rupeesPart} and ${integerToWords(paise)} ${paiseWord} Only`;
}
