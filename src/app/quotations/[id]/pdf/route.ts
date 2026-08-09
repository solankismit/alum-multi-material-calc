import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getQuotation } from "../../actions";
import QuotationPdfDocument from "../QuotationPdfDocument";
import React, { type ReactElement } from "react";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const res = await getQuotation(id);

    if (!res.success || !res.data) {
        return NextResponse.json({ error: res.error || "Quotation not found" }, { status: 404 });
    }

    const quote = res.data;
    const business = {
        name: quote.user?.company || quote.user?.name || "Your Company",
        address: quote.user?.businessAddress,
        phone: quote.user?.businessPhone,
    };

    const buffer = await renderToBuffer(
        React.createElement(QuotationPdfDocument, { quote, business }) as ReactElement<DocumentProps>
    );

    return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="Quotation-${quote.quotationNumber || quote.id.slice(0, 8)}.pdf"`,
        },
    });
}
