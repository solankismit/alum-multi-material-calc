import { Document, Page, View, Text, StyleSheet, Svg, Rect, Font } from "@react-pdf/renderer";
import { formatCurrency } from "@/utils/formatters";
import type { WindowInput } from "@/types";
import path from "path";

// Helvetica (react-pdf's default base font) has no glyph for the Indian Rupee
// sign (U+20B9) — it silently substitutes a wrong character. Noto Sans does
// carry that glyph, so quotations render "₹1,74,886" correctly instead of a
// stray superscript "¹". Registered from a variable font file (only static
// weight the upstream repo publishes for this family): fontkit renders it at
// its default instance regardless of the `fontWeight` used below, so bold
// styling in this document is a no-op visually — acceptable trade-off for a
// document where the currency symbol has to be correct.
Font.register({
    family: "NotoSans",
    src: path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf"),
});

interface LineItem {
    name: string;
    quantity?: number;
    area?: number;
    unit: string;
    rate: number;
    cost: number;
}

interface QuotationPricing {
    profiles: LineItem[];
    glass: LineItem[];
    accessories: LineItem[];
    labor?: number;
    overhead?: number;
    profitMargin?: number;
    taxRate?: number;
}

interface QuotationPdfProps {
    quote: {
        id: string;
        quotationNumber: string | null;
        clientName: string | null;
        clientPhone: string | null;
        clientAddress: string | null;
        createdAt: Date;
        totalAmount: number;
        pricingData: unknown;
        worksheet: { data: unknown } | null;
    };
    business: {
        name: string;
        address?: string | null;
        phone?: string | null;
    };
}

const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "NotoSans", color: "#1e293b" },
    headerRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: "#1e293b", paddingBottom: 16, marginBottom: 20 },
    title: { fontSize: 26, fontWeight: 700, marginBottom: 4 },
    muted: { color: "#64748b", fontSize: 9 },
    bold: { fontWeight: 700 },
    sectionLabel: { fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 },
    clientBlock: { marginBottom: 24 },
    clientName: { fontSize: 15, fontWeight: 700 },
    diagramGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
    diagramBox: { width: 150, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, padding: 6, alignItems: "center" },
    diagramCaption: { fontSize: 8, fontWeight: 700, marginTop: 4, textAlign: "center" },
    table: { marginBottom: 20 },
    tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#cbd5e1", paddingBottom: 6, marginBottom: 4 },
    tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9", paddingVertical: 5 },
    colDesc: { flex: 4 },
    colQty: { flex: 2, textAlign: "right" },
    colRate: { flex: 2, textAlign: "right" },
    colAmount: { flex: 2, textAlign: "right", fontWeight: 700 },
    headerCell: { fontWeight: 700, color: "#475569" },
    totalsBlock: { alignSelf: "flex-end", width: "50%", marginTop: 10 },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    grandTotalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 2, borderTopColor: "#1e293b", paddingTop: 8, marginTop: 8 },
    grandTotalText: { fontSize: 16, fontWeight: 700 },
    terms: { marginTop: 40, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
    termsTitle: { fontWeight: 700, marginBottom: 6 },
    termsItem: { color: "#64748b", fontSize: 9, marginBottom: 2 },
});

// Simplified diagram — react-pdf's Svg has no tiling <pattern> support, so glass
// and mesh are represented with flat fills/opacity + dashed strokes instead of
// the hatch textures used in the on-screen WindowSchematic. Panel geometry
// mirrors that component so the shapes stay consistent between screen and PDF.
function PdfWindowDiagram({ trackType, configuration, panels: panelCount }: { trackType: string; configuration: string; panels: number }) {
    const width = 130;
    const height = 90;
    const padding = 6;
    const frameW = width - padding * 2;
    const frameH = height - padding * 2;

    let panels: { type: string; offset: number; widthRatio: number }[] = [];
    let mosquitoOverlay = false;

    if (trackType === "openable") {
        const n = Math.max(1, panelCount);
        for (let i = 0; i < n; i++) {
            panels.push({ type: "openable", offset: i / n, widthRatio: 1 / n });
        }
    } else if (trackType === "3-track" && configuration === "all-glass") {
        panels = [
            { type: "glass", offset: 0, widthRatio: 0.35 },
            { type: "glass", offset: 0.32, widthRatio: 0.35 },
            { type: "glass", offset: 0.64, widthRatio: 0.36 },
        ];
    } else if (trackType === "3-track") {
        panels = [
            { type: "glass", offset: 0, widthRatio: 0.52 },
            { type: "glass", offset: 0.48, widthRatio: 0.52 },
        ];
        mosquitoOverlay = true;
    } else if (configuration === "all-glass") {
        panels = [
            { type: "glass", offset: 0, widthRatio: 0.52 },
            { type: "glass", offset: 0.48, widthRatio: 0.52 },
        ];
    } else {
        panels = [
            { type: "glass", offset: 0, widthRatio: 0.52 },
            { type: "mosquito", offset: 0.48, widthRatio: 0.52 },
        ];
    }

    return (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <Rect x={padding} y={padding} width={frameW} height={frameH} fill="none" stroke="#334155" strokeWidth={2} />
            {mosquitoOverlay && (
                <Rect
                    x={padding + frameW * 0 - 2}
                    y={padding + 2}
                    width={frameW * 0.52 + 4}
                    height={frameH - 4}
                    fill="#94a3b8"
                    fillOpacity={0.25}
                    stroke="#475569"
                    strokeWidth={1}
                    strokeDasharray="3,2"
                />
            )}
            {panels.map((panel, idx) => {
                const isOpenable = trackType === "openable";
                const panelW = isOpenable ? frameW / panels.length - 2 : frameW * panel.widthRatio;
                const panelX = isOpenable ? padding + idx * (frameW / panels.length) + 1 : padding + frameW * panel.offset;
                const panelY = padding + 3;
                const panelH = frameH - 6;
                const isMosquito = panel.type === "mosquito";
                return (
                    <Rect
                        key={idx}
                        x={panelX}
                        y={panelY}
                        width={panelW}
                        height={panelH}
                        fill={isMosquito ? "#cbd5e1" : "#dbeafe"}
                        fillOpacity={isMosquito ? 0.6 : 0.4}
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                    />
                );
            })}
        </Svg>
    );
}

export default function QuotationPdfDocument({ quote, business }: QuotationPdfProps) {
    const pricing = quote.pricingData as unknown as QuotationPricing;
    const profilesTotal = pricing.profiles.reduce((acc, curr) => acc + curr.cost, 0);
    const glassTotal = pricing.glass.reduce((acc, curr) => acc + curr.cost, 0);
    const accessoriesTotal = pricing.accessories.reduce((acc, curr) => acc + curr.cost, 0);
    const subTotal = profilesTotal + glassTotal + accessoriesTotal + (pricing.labor || 0) + (pricing.overhead || 0);
    const profitMargin = pricing.profitMargin || 0;
    const taxRate = pricing.taxRate || 0;

    const worksheetInput = quote.worksheet?.data ? (quote.worksheet.data as { input?: WindowInput }).input : undefined;
    const diagramSections = (worksheetInput?.sections || []).map((section) => {
        const firstDim = section.dimensions?.[0];
        const panels = firstDim?.sections;
        const isOpenable = typeof panels === "number" && panels > 0;
        const qty = section.dimensions?.reduce((sum, d) => sum + (d.quantity || 0), 0) || 0;
        return {
            id: section.id,
            name: section.name,
            trackType: isOpenable ? "openable" : section.trackType,
            configuration: section.configuration,
            panels: isOpenable ? (panels as number) : 2,
            qty,
        };
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>QUOTATION</Text>
                        <Text style={styles.muted}>#{quote.quotationNumber}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.bold}>{business.name}</Text>
                        {business.address && <Text style={styles.muted}>{business.address}</Text>}
                        {business.phone && <Text style={styles.muted}>{business.phone}</Text>}
                        <Text style={[styles.muted, { marginTop: 4 }]}>Date: {new Date(quote.createdAt).toLocaleDateString()}</Text>
                    </View>
                </View>

                <View style={styles.clientBlock}>
                    <Text style={styles.sectionLabel}>Bill To</Text>
                    <Text style={styles.clientName}>{quote.clientName || "Valued Client"}</Text>
                    {quote.clientPhone && <Text style={styles.muted}>{quote.clientPhone}</Text>}
                    {quote.clientAddress && <Text style={styles.muted}>{quote.clientAddress}</Text>}
                </View>

                {diagramSections.length > 0 && (
                    <View>
                        <Text style={styles.sectionLabel}>Window Diagrams</Text>
                        <View style={styles.diagramGrid}>
                            {diagramSections.map((section) => (
                                <View key={section.id} style={styles.diagramBox}>
                                    <PdfWindowDiagram trackType={section.trackType} configuration={section.configuration} panels={section.panels} />
                                    <Text style={styles.diagramCaption}>
                                        {section.name}{section.qty > 1 ? ` x ${section.qty}` : ""}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.colDesc, styles.headerCell]}>Description</Text>
                        <Text style={[styles.colQty, styles.headerCell]}>Quantity</Text>
                        <Text style={[styles.colRate, styles.headerCell]}>Rate</Text>
                        <Text style={[styles.colAmount, styles.headerCell]}>Amount</Text>
                    </View>

                    {pricing.profiles.map((p, idx) => (
                        <View style={styles.tableRow} key={`p-${idx}`}>
                            <Text style={styles.colDesc}>{p.name} (Aluminium Profile)</Text>
                            <Text style={styles.colQty}>{(p.quantity ?? 0).toFixed(2)} {p.unit}</Text>
                            <Text style={styles.colRate}>{formatCurrency(p.rate)}</Text>
                            <Text style={styles.colAmount}>{formatCurrency(p.cost)}</Text>
                        </View>
                    ))}
                    {pricing.glass.map((g, idx) => (
                        <View style={styles.tableRow} key={`g-${idx}`}>
                            <Text style={styles.colDesc}>{g.name}</Text>
                            <Text style={styles.colQty}>{(g.area ?? 0).toFixed(2)} {g.unit}</Text>
                            <Text style={styles.colRate}>{formatCurrency(g.rate)}</Text>
                            <Text style={styles.colAmount}>{formatCurrency(g.cost)}</Text>
                        </View>
                    ))}
                    {pricing.accessories.filter((a) => a.cost > 0).map((a, idx) => (
                        <View style={styles.tableRow} key={`a-${idx}`}>
                            <Text style={styles.colDesc}>{a.name}</Text>
                            <Text style={styles.colQty}>{(a.quantity ?? 0).toFixed(2)} {a.unit}</Text>
                            <Text style={styles.colRate}>{formatCurrency(a.rate)}</Text>
                            <Text style={styles.colAmount}>{formatCurrency(a.cost)}</Text>
                        </View>
                    ))}
                    {(pricing.labor ?? 0) > 0 && (
                        <View style={styles.tableRow}>
                            <Text style={styles.colDesc}>Labor Charges</Text>
                            <Text style={styles.colQty}>-</Text>
                            <Text style={styles.colRate}>-</Text>
                            <Text style={styles.colAmount}>{formatCurrency(pricing.labor || 0)}</Text>
                        </View>
                    )}
                    {(pricing.overhead ?? 0) > 0 && (
                        <View style={styles.tableRow}>
                            <Text style={styles.colDesc}>Overhead / Misc</Text>
                            <Text style={styles.colQty}>-</Text>
                            <Text style={styles.colRate}>-</Text>
                            <Text style={styles.colAmount}>{formatCurrency(pricing.overhead || 0)}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.totalsBlock}>
                    <View style={styles.totalsRow}>
                        <Text>Subtotal</Text>
                        <Text>{formatCurrency(subTotal)}</Text>
                    </View>
                    {profitMargin > 0 && (
                        <View style={styles.totalsRow}>
                            <Text>Profit ({profitMargin}%)</Text>
                            <Text>{formatCurrency(subTotal * (profitMargin / 100))}</Text>
                        </View>
                    )}
                    <View style={styles.totalsRow}>
                        <Text>Tax ({taxRate}%)</Text>
                        <Text>{formatCurrency(subTotal * (1 + profitMargin / 100) * (taxRate / 100))}</Text>
                    </View>
                    <View style={styles.grandTotalRow}>
                        <Text style={styles.grandTotalText}>Total</Text>
                        <Text style={styles.grandTotalText}>{formatCurrency(quote.totalAmount)}</Text>
                    </View>
                </View>

                <View style={styles.terms}>
                    <Text style={styles.termsTitle}>Terms &amp; Conditions</Text>
                    <Text style={styles.termsItem}>- Payment terms: 50% advance, balance upon completion.</Text>
                    <Text style={styles.termsItem}>- Valid for 30 days from date of issue.</Text>
                </View>
            </Page>
        </Document>
    );
}
