/**
 * Renders a DOM element to a paginated A4 PDF entirely in the browser — used
 * so a document (quotation, cutting plan, etc.) can be handed to the Web
 * Share API as a real file, instead of relying on the browser's own
 * Print → Save as PDF dialog (which produces no file the page can touch).
 *
 * html2canvas + jsPDF is a snapshot approach: the element is rasterized once,
 * then sliced across pages. Good enough for our print layouts (mostly white
 * backgrounds, tables, simple SVGs); not a substitute for a real HTML→PDF
 * renderer if pixel-perfect text selection in the PDF ever matters.
 */
export async function generatePdfFile(elementId: string, filename: string): Promise<File> {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Could not find element #${elementId} to export`);
    }

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
    ]);

    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        // html2canvas rasterizes whatever is on screen right now — it does not
        // evaluate @media print, so Tailwind's `print:hidden` (used throughout
        // these pages for action buttons/banners that shouldn't appear in the
        // printed document) would otherwise get baked into the PDF image.
        ignoreElements: (el) => el.classList.contains("print:hidden"),
        // This app's Tailwind theme defines colors with modern CSS color
        // functions (lab()/oklch()) that html2canvas's own CSS parser doesn't
        // understand and throws on. foreignObjectRendering delegates painting
        // to the browser's real renderer instead of html2canvas's parser,
        // which sidesteps that entirely.
        foreignObjectRendering: true,
    });

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/png");

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }

    const blob = pdf.output("blob") as Blob;
    return new File([blob], filename, { type: "application/pdf" });
}
