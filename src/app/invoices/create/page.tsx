import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { getQuotationInvoiceDraft, getInvoice } from "../actions";
import { listCustomers } from "@/app/customers/actions";
import InvoiceForm, { type InvoiceFormInitial } from "../InvoiceForm";
import { AccessDenied } from "@/components/layout/AccessDenied";
import { DEFAULT_TAX_TYPE, type TaxType } from "@/utils/quotationPricing";

export default async function CreateInvoicePage({
    searchParams,
}: {
    searchParams: Promise<{ quotationId?: string; editId?: string }>;
}) {
    const session = await verifySession();
    const { quotationId, editId } = await searchParams;

    let initial: InvoiceFormInitial = {
        quotationId: null,
        customerId: null,
        buyerName: "",
        buyerAddress: "",
        buyerGstNumber: "",
        buyerPhone: "",
        gstRate: null,
        taxType: DEFAULT_TAX_TYPE,
        invoicePrefix: "INV",
        lines: [],
    };

    if (editId) {
        const res = await getInvoice(editId);
        if (!res.success || !res.data) {
            return <AccessDenied message={res.error || "Invoice not found."} backHref="/invoices" backLabel="Back to Invoices" />;
        }
        const invoice = res.data;
        if (invoice.status !== "DRAFT") {
            return (
                <AccessDenied
                    message="This invoice has already been issued and can no longer be edited."
                    backHref={`/invoices/${editId}`}
                    backLabel="Go to Invoice"
                />
            );
        }
        initial = {
            quotationId: invoice.quotationId,
            customerId: invoice.customerId,
            buyerName: invoice.buyerName,
            buyerAddress: invoice.buyerAddress ?? "",
            buyerGstNumber: invoice.buyerGstNumber ?? "",
            buyerPhone: invoice.buyerPhone ?? "",
            gstRate: invoice.gstRate,
            taxType: invoice.taxType as TaxType,
            invoicePrefix: invoice.invoicePrefix,
            lines: invoice.lines.map((l) => ({
                description: l.description,
                quantity: l.quantity ?? undefined,
                unit: l.unit ?? undefined,
                ratePerUnit: l.ratePerUnit ?? undefined,
                taxableAmount: l.taxableAmount,
                hsnCode: l.hsnCode ?? undefined,
                gstRate: l.gstRate ?? undefined,
            })),
        };
    } else if (quotationId) {
        const draft = await getQuotationInvoiceDraft(quotationId);
        if (!draft.success || !draft.data) {
            return <AccessDenied message={draft.error || "Quotation not found."} backHref="/quotations" backLabel="Back to Quotations" />;
        }
        initial = {
            ...initial,
            quotationId: draft.data.quotationId,
            customerId: draft.data.customerId,
            buyerName: draft.data.buyerName,
            buyerAddress: draft.data.buyerAddress,
            buyerGstNumber: draft.data.buyerGstNumber,
            buyerPhone: draft.data.buyerPhone,
            lines: draft.data.lines,
        };
    }

    const [customersRes, rateCard] = await Promise.all([
        listCustomers(),
        db.rateCard.findUnique({ where: { userId: session.userId as string } }),
    ]);

    return (
        <InvoiceForm
            invoiceId={editId}
            initial={initial}
            customers={customersRes.success ? customersRes.data : []}
            hsnCodes={(rateCard?.hsnCodes as Record<string, string>) ?? {}}
        />
    );
}
