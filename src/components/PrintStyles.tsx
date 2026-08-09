/**
 * Shared print-pagination rules for every printable document (quotation,
 * worksheet report, cutting plan, windows list). Sets real page geometry and
 * makes sure colors/borders survive the browser's print pipeline instead of
 * relying purely on Tailwind's `print:` utility classes.
 */
export default function PrintStyles() {
    return (
        <style>{`
            @media print {
                @page {
                    size: A4;
                    margin: 10mm;
                }
                html, body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    line-height: 1.3;
                }
                h1, h2, h3, h4 {
                    break-after: avoid;
                }
                tr, li {
                    break-inside: avoid;
                }
            }
        `}</style>
    );
}
