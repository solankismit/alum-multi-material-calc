import Link from "next/link";
import { getInvoice } from "../actions";
import { isInvoiceLockAfterPrintEnabled } from "@/utils/invoiceConfig";
import { splitTax, type TaxType } from "@/utils/quotationPricing";
import { amountInWords } from "@/utils/numberToWords";
import { getCompanySnapshot, type CompanySnapshot } from "@/utils/companyConfig";
import InvoiceDocument from "./InvoiceDocument";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function InvoiceView({ params }: PageProps) {
    const { id } = await params;
    const res = await getInvoice(id);

    if (!res.success || !res.data) {
        return (
            <div className="p-8 text-center">
                <p className="text-danger mb-4">{res.error || "Invoice not found"}</p>
                <Link href="/invoices" className="text-primary hover:underline text-sm font-medium">
                    &larr; Back to Invoices
                </Link>
            </div>
        );
    }

    const invoice = res.data;

    // While DRAFT, the header shows the seller's CURRENT settings (nothing
    // is frozen yet). Once issued, sellerSnapshot is the source of truth —
    // editing company settings later must never rewrite an issued invoice.
    const business: CompanySnapshot =
        invoice.status === "DRAFT" || !invoice.sellerSnapshot
            ? getCompanySnapshot(invoice.user)
            : (invoice.sellerSnapshot as unknown as CompanySnapshot);

    const taxType = invoice.taxType as TaxType;
    const taxableAmount = invoice.lines.reduce((sum, l) => sum + l.taxableAmount, 0);
    const gstAmount = invoice.lines.reduce((sum, l) => {
        const rate = l.gstRate ?? invoice.gstRate ?? 0;
        return sum + (l.taxableAmount * rate) / 100;
    }, 0);
    const taxSplit = splitTax(gstAmount, taxType);
    const grandTotal = taxableAmount + taxSplit.cgst + taxSplit.sgst + taxSplit.igst;

    const locked = invoice.status === "PAID" || invoice.status === "CANCELLED" || (invoice.status === "ISSUED" && isInvoiceLockAfterPrintEnabled());

    return (
        <InvoiceDocument
            invoice={{
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                invoicePrefix: invoice.invoicePrefix,
                status: invoice.status,
                createdAt: invoice.createdAt,
                finalizedAt: invoice.finalizedAt,
                buyerName: invoice.buyerName,
                buyerAddress: invoice.buyerAddress,
                buyerGstNumber: invoice.buyerGstNumber,
                buyerPhone: invoice.buyerPhone,
                gstRate: invoice.gstRate,
                quotationNumber: invoice.quotation?.quotationNumber ?? null,
            }}
            lines={invoice.lines}
            business={business}
            taxType={taxType}
            locked={locked}
            totals={{
                taxableAmount,
                cgst: taxSplit.cgst,
                sgst: taxSplit.sgst,
                igst: taxSplit.igst,
                gstAmount: taxSplit.cgst + taxSplit.sgst + taxSplit.igst,
                grandTotal,
                amountInWords: amountInWords(grandTotal),
            }}
        />
    );
}
