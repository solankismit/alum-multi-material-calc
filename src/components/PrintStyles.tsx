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
                    /* Page X of Y — Firefox/Chrome both support the
                       page/pages counters inside an @page margin box. */
                    @bottom-right {
                        content: "Page " counter(page) " of " counter(pages);
                        font-size: 8pt;
                        color: #94a3b8;
                    }
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
                /* Without this, a table's header row (HSN/Rate/GST/Amount
                   columns) only prints on page 1 — every row on later pages
                   becomes an unlabeled number, which is a real defect on a
                   legal document, not just cosmetic. */
                thead {
                    display: table-header-group;
                }
            }
        `}</style>
    );
}
