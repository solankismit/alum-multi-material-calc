"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { createQuotation } from "../actions";
import { resolveMaterialCategory, MATERIAL_CATEGORY_LABELS } from "@/utils/materialCategory";
import { calculateLaborCost, type LaborMode } from "@/utils/laborCost";
import type { MaterialCategory, WindowInput } from "@/types";
import WindowSchematic from "@/components/WindowSchematic";

interface RateMap {
    [key: string]: number;
}

interface RateCardData {
    profileRatePerFt: number;
    profileRates: RateMap;
    glassRates: RateMap;
    hardwareRates: RateMap;
    laborMode: LaborMode;
    laborDefault: number;
    laborPercent: number;
    laborRatePerSqft: number;
    overheadDefault: number;
    profitMarginDefault: number;
    taxRateDefault: number;
    termsText: string;
}

interface FreeformItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    rate: number;
}

interface SectionResult {
    sectionId: string;
    sectionName: string;
    sectionTypeName?: string;
    materials: Array<{ category?: MaterialCategory; component: string; stockBreakdown: { stockName: string; stockLength: number; stocksNeeded: number } }>;
    glassInfo: Array<{ glassSize: { totalArea: number } }>;
    accessories: { mosquitoCChannel: number; trackCap: number };
}

interface LineItem {
    name: string;
    quantity?: number;
    area?: number;
    unit: string;
    rate: number;
    cost: number;
}

interface SectionPricing {
    sectionId: string;
    sectionName: string;
    sectionTypeName?: string;
    trackType: string;
    configuration: string;
    panels: number;
    qty: number;
    areaSqFt: number;
    widthMm: number;
    heightMm: number;
    profiles: LineItem[];
    glass: LineItem[];
    accessories: LineItem[];
    subtotal: number;
}

/**
 * Rates shared by every section using the same aluminium system (Section Type).
 * Sections that reuse a system automatically reuse its rates; a different
 * system gets its own independent set — grouping is by type, not per-instance.
 */
interface SectionTypeRates {
    sectionTypeKey: string;
    sectionTypeName: string;
    usedBySectionNames: string[];
    profileRates: RateMap;
    glassType: string;
    glassRate: number;
    meshRate: number;
    trackCapRate: number;
}

type DiscountType = "percent" | "flat";

/** Groups a section by its aluminium system — same system = same rates, different system = independently priced. */
function getSectionTypeKey(section: { sectionId: string; sectionTypeName?: string }, inputSectionTypeId?: string): string {
    return inputSectionTypeId || section.sectionTypeName || section.sectionId;
}

const LABOR_MODE_LABELS: Record<LaborMode, string> = {
    flat: "Flat Amount (₹)",
    percentOfMaterial: "% of Material Cost",
    perSqft: "₹ per Sq.Ft",
};

function computeOverallAreaSqFt(sections: WindowInput["sections"] | undefined): number {
    if (!sections) return 0;
    let totalSqMm = 0;
    sections.forEach((section) => {
        section.dimensions.forEach((dim) => {
            if (dim.width && dim.height && dim.quantity) {
                totalSqMm += dim.width * dim.height * dim.quantity;
            }
        });
    });
    return totalSqMm / 92903;
}

export default function QuotationBuilder() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const worksheetId = searchParams.get("worksheetId");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sectionResults, setSectionResults] = useState<SectionResult[]>([]);
    const [windowInput, setWindowInput] = useState<WindowInput | null>(null);
    const [overallAreaSqFt, setOverallAreaSqFt] = useState<number>(0);
    const [rateCard, setRateCard] = useState<RateCardData | null>(null);

    // Pricing state — seeded from the rate card once it loads. Keyed by
    // section-type: identical systems share one rate bundle automatically,
    // different systems get independent ones.
    const [sectionTypeRates, setSectionTypeRates] = useState<Record<string, SectionTypeRates>>({});

    // Direct-entry (no worksheet) line items
    const [freeformItems, setFreeformItems] = useState<FreeformItem[]>([
        { id: crypto.randomUUID(), name: "", quantity: 1, unit: "nos", rate: 0 },
    ]);

    // Overheads — seeded from rate card defaults
    const [laborMode, setLaborMode] = useState<LaborMode>("flat");
    const [laborFlatAmount, setLaborFlatAmount] = useState<number>(0);
    const [laborPercent, setLaborPercent] = useState<number>(0);
    const [laborRatePerSqft, setLaborRatePerSqft] = useState<number>(0);
    const [overheadCost, setOverheadCost] = useState<number>(0);
    const [profitMargin, setProfitMargin] = useState<number>(0);
    const [taxRate, setTaxRate] = useState<number>(0);
    const [discountType, setDiscountType] = useState<DiscountType>("percent");
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [termsText, setTermsText] = useState<string>("");

    // Metadata
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientAddress, setClientAddress] = useState("");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [customerRef, setCustomerRef] = useState("");

    useEffect(() => {
        const loadRateCard = fetch("/api/user/rate-card")
            .then((res) => res.json())
            .then((data) => data.rateCard as RateCardData | null);

        const loadWorksheet = worksheetId
            ? fetch(`/api/worksheets/${worksheetId}`).then((res) => res.json())
            : Promise.resolve(null);

        Promise.all([loadRateCard, loadWorksheet]).then(([card, worksheet]) => {
            if (card) {
                setRateCard(card);
                setLaborMode(card.laborMode ?? "flat");
                setLaborFlatAmount(card.laborDefault);
                setLaborPercent(card.laborPercent ?? 0);
                setLaborRatePerSqft(card.laborRatePerSqft ?? 0);
                setOverheadCost(card.overheadDefault);
                setProfitMargin(card.profitMarginDefault);
                setTaxRate(card.taxRateDefault);
                setTermsText(card.termsText ?? "");
            }

            const input: WindowInput | undefined = worksheet?.data?.input;
            setWindowInput(input ?? null);
            setOverallAreaSqFt(computeOverallAreaSqFt(input?.sections));

            const results: SectionResult[] = worksheet?.data?.result?.sectionResults;
            if (results) {
                setSectionResults(results);

                const firstGlassType = card ? Object.keys(card.glassRates)[0] : undefined;
                const typeRates: Record<string, SectionTypeRates> = {};

                results.forEach((section) => {
                    const inputSection = input?.sections.find((s) => s.id === section.sectionId);
                    const key = getSectionTypeKey(section, inputSection?.sectionTypeId);

                    if (!typeRates[key]) {
                        typeRates[key] = {
                            sectionTypeKey: key,
                            sectionTypeName: section.sectionTypeName || section.sectionName,
                            usedBySectionNames: [],
                            profileRates: {},
                            glassType: firstGlassType || "",
                            glassRate: firstGlassType && card ? card.glassRates[firstGlassType] : 0,
                            meshRate: card?.hardwareRates["Mosquito Mesh"] ?? card?.hardwareRates["C-Channel"] ?? 0,
                            trackCapRate: card?.hardwareRates["Track Cap"] ?? 0,
                        };
                    }
                    typeRates[key].usedBySectionNames.push(section.sectionName);

                    section.materials.forEach((mat) => {
                        const category = resolveMaterialCategory(mat);
                        if (typeRates[key].profileRates[category] === undefined) {
                            typeRates[key].profileRates[category] = card?.profileRates?.[category] ?? card?.profileRatePerFt ?? 0;
                        }
                    });
                });

                setSectionTypeRates(typeRates);
            }

            // Freeform quotations have no material-cost/area basis for the
            // percent/per-sqft labor modes — always fall back to flat there.
            if (!worksheet && card && card.laborMode !== "flat") {
                setLaborMode("flat");
            }
            setLoading(false);
        });
    }, [worksheetId]);

    const totals = useMemo(() => {
        if (worksheetId) {
            const AREA_SQMM_PER_SQFT = 92903;

            const sectionBreakdowns: SectionPricing[] = sectionResults.map((section) => {
                const inputSection = windowInput?.sections.find((s) => s.id === section.sectionId);
                const firstDim = inputSection?.dimensions?.[0];
                const panelsRaw = firstDim?.sections;
                const isOpenable = typeof panelsRaw === "number" && panelsRaw > 0;
                const qty = inputSection?.dimensions?.reduce((sum, d) => sum + (d.quantity || 0), 0) || 0;
                const areaSqFt = inputSection?.dimensions?.reduce(
                    (sum, d) => sum + ((d.width || 0) * (d.height || 0) * (d.quantity || 0)) / AREA_SQMM_PER_SQFT,
                    0
                ) || 0;

                const typeKey = getSectionTypeKey(section, inputSection?.sectionTypeId);
                const typeRates = sectionTypeRates[typeKey];

                // Profile lines — grouped by category, scoped to this section only,
                // priced using its section-type's shared rate bundle.
                const sectionProfileQty: RateMap = {};
                section.materials.forEach((mat) => {
                    const category = resolveMaterialCategory(mat);
                    const ft = (mat.stockBreakdown.stocksNeeded * mat.stockBreakdown.stockLength) / 304.8;
                    sectionProfileQty[category] = (sectionProfileQty[category] || 0) + ft;
                });
                const profiles: LineItem[] = Object.entries(sectionProfileQty).map(([category, qtyFt]) => {
                    const rate = typeRates?.profileRates[category] || 0;
                    return {
                        name: MATERIAL_CATEGORY_LABELS[category as keyof typeof MATERIAL_CATEGORY_LABELS] ?? category,
                        quantity: qtyFt,
                        unit: "ft",
                        rate,
                        cost: qtyFt * rate,
                    };
                });

                const sectionGlassAreaSqFt = section.glassInfo.reduce((sum, g) => sum + g.glassSize.totalArea, 0) / AREA_SQMM_PER_SQFT;
                const glass: LineItem[] = sectionGlassAreaSqFt > 0
                    ? [{ name: typeRates?.glassType || "Glass", area: sectionGlassAreaSqFt, unit: "sqft", rate: typeRates?.glassRate || 0, cost: sectionGlassAreaSqFt * (typeRates?.glassRate || 0) }]
                    : [];

                const meshRate = typeRates?.meshRate || 0;
                const trackCapRate = typeRates?.trackCapRate || 0;
                const accessories: LineItem[] = [
                    ...(section.accessories.mosquitoCChannel > 0 ? [{ name: "Mosquito Mesh / C-Channel", quantity: section.accessories.mosquitoCChannel, unit: "nos", rate: meshRate, cost: section.accessories.mosquitoCChannel * meshRate }] : []),
                    ...(section.accessories.trackCap > 0 ? [{ name: "Track Cap", quantity: section.accessories.trackCap, unit: "nos", rate: trackCapRate, cost: section.accessories.trackCap * trackCapRate }] : []),
                ];

                const subtotal =
                    profiles.reduce((s, p) => s + p.cost, 0) +
                    glass.reduce((s, g) => s + g.cost, 0) +
                    accessories.reduce((s, a) => s + a.cost, 0);

                return {
                    sectionId: section.sectionId,
                    sectionName: section.sectionName,
                    sectionTypeName: section.sectionTypeName,
                    trackType: isOpenable ? "openable" : (inputSection?.trackType || "2-track"),
                    configuration: inputSection?.configuration || "all-glass",
                    panels: isOpenable ? (panelsRaw as number) : 2,
                    qty,
                    areaSqFt,
                    widthMm: firstDim?.width || 0,
                    heightMm: firstDim?.height || 0,
                    profiles,
                    glass,
                    accessories,
                    subtotal,
                };
            });

            const totalProfileCost = sectionBreakdowns.reduce((sum, s) => sum + s.profiles.reduce((ss, p) => ss + p.cost, 0), 0);
            const totalGlassAreaSqFt = sectionBreakdowns.reduce((sum, s) => sum + s.glass.reduce((ss, g) => ss + (g.area || 0), 0), 0);
            const totalGlassCost = sectionBreakdowns.reduce((sum, s) => sum + s.glass.reduce((ss, g) => ss + g.cost, 0), 0);
            const meshCount = sectionResults.reduce((sum, s) => sum + s.accessories.mosquitoCChannel, 0);
            const trackCapCount = sectionResults.reduce((sum, s) => sum + s.accessories.trackCap, 0);
            const totalAccessoryCost = sectionBreakdowns.reduce((sum, s) => sum + s.accessories.reduce((ss, a) => ss + a.cost, 0), 0);

            const materialCost = totalProfileCost + totalGlassCost + totalAccessoryCost;
            const laborCost = calculateLaborCost(
                laborMode,
                { flatAmount: laborFlatAmount, percent: laborPercent, ratePerSqft: laborRatePerSqft },
                { materialCost, totalAreaSqFt: overallAreaSqFt }
            );

            const subTotal = materialCost + laborCost + Number(overheadCost);
            const discountAmount = discountType === "percent" ? subTotal * (discountValue / 100) : discountValue;
            const discountedSubtotal = Math.max(0, subTotal - discountAmount);
            const profitAmount = discountedSubtotal * (profitMargin / 100);
            const taxableAmount = discountedSubtotal + profitAmount;
            const taxAmount = taxableAmount * (taxRate / 100);

            return {
                sectionBreakdowns,
                totalProfileCost,
                totalGlassAreaSqFt,
                overallAreaSqFt,
                totalGlassCost,
                meshCount,
                trackCapCount,
                totalAccessoryCost,
                laborCost,
                subTotal,
                discountAmount,
                discountedSubtotal,
                profitAmount,
                taxAmount,
                finalTotal: taxableAmount + taxAmount,
            };
        }

        // Direct-entry mode — only flat labor makes sense (no material cost/area basis)
        const itemsCost = freeformItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
        const laborCost = calculateLaborCost(
            "flat",
            { flatAmount: laborFlatAmount, percent: laborPercent, ratePerSqft: laborRatePerSqft },
            { materialCost: itemsCost, totalAreaSqFt: 0 }
        );
        const subTotal = itemsCost + laborCost + Number(overheadCost);
        const discountAmount = discountType === "percent" ? subTotal * (discountValue / 100) : discountValue;
        const discountedSubtotal = Math.max(0, subTotal - discountAmount);
        const profitAmount = discountedSubtotal * (profitMargin / 100);
        const taxableAmount = discountedSubtotal + profitAmount;
        const taxAmount = taxableAmount * (taxRate / 100);

        return {
            sectionBreakdowns: [] as SectionPricing[],
            totalProfileCost: 0,
            totalGlassAreaSqFt: 0,
            overallAreaSqFt: 0,
            totalGlassCost: 0,
            meshCount: 0,
            trackCapCount: 0,
            totalAccessoryCost: 0,
            itemsCost,
            laborCost,
            subTotal,
            discountAmount,
            discountedSubtotal,
            profitAmount,
            taxAmount,
            finalTotal: taxableAmount + taxAmount,
        };
    }, [worksheetId, sectionResults, windowInput, sectionTypeRates, freeformItems, laborMode, laborFlatAmount, laborPercent, laborRatePerSqft, overheadCost, profitMargin, taxRate, discountType, discountValue, overallAreaSqFt]);

    const addFreeformItem = () => {
        setFreeformItems([...freeformItems, { id: crypto.randomUUID(), name: "", quantity: 1, unit: "nos", rate: 0 }]);
    };

    const updateFreeformItem = (id: string, updates: Partial<FreeformItem>) => {
        setFreeformItems(freeformItems.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    };

    const removeFreeformItem = (id: string) => {
        setFreeformItems(freeformItems.filter((item) => item.id !== id));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const pricingData = worksheetId
                ? {
                    sections: totals.sectionBreakdowns,
                    labor: totals.laborCost,
                    laborBreakdown: { mode: laborMode, percent: laborPercent, ratePerSqft: laborRatePerSqft },
                    overhead: overheadCost,
                    discount: { type: discountType, value: discountValue, amount: totals.discountAmount },
                    profitMargin,
                    taxRate,
                    termsText,
                }
                : {
                    profiles: [],
                    glass: [],
                    accessories: freeformItems
                        .filter((item) => item.name.trim())
                        .map((item) => ({ name: item.name, quantity: item.quantity, unit: item.unit, rate: item.rate, cost: item.quantity * item.rate })),
                    labor: totals.laborCost,
                    laborBreakdown: { mode: "flat" as const, percent: laborPercent, ratePerSqft: laborRatePerSqft },
                    overhead: overheadCost,
                    discount: { type: discountType, value: discountValue, amount: totals.discountAmount },
                    profitMargin,
                    taxRate,
                    termsText,
                };

            const res = await createQuotation({
                worksheetId,
                clientName,
                clientPhone,
                clientAddress,
                deliveryAddress: deliveryAddress || clientAddress,
                customerRef,
                pricingData,
                totalAmount: totals.finalTotal,
            });

            if (res.success) {
                router.push(`/quotations/${res.id}`);
            } else {
                alert("Failed to save: " + res.error);
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Data...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Link href="/dashboard">
                        <Button variant="ghost">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900">Create Quotation</h1>
                    <Button onClick={handleSave} isLoading={saving} className="bg-indigo-600 hover:bg-indigo-700">
                        <Save className="w-4 h-4 mr-2" />
                        Generate Quote
                    </Button>
                </div>

                {!rateCard && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
                        You have not set up a{" "}
                        <Link href="/dashboard/rate-card" className="underline font-semibold">
                            Rate Card
                        </Link>{" "}
                        yet — rates below start at zero. Set it up once to skip this every time.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        {/* Client Details */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h2 className="font-semibold text-lg text-slate-800 border-b pb-2">Client Details</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Client Name</Label>
                                    <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Type name..." />
                                </div>
                                <div>
                                    <Label>Customer Ref</Label>
                                    <Input value={customerRef} onChange={(e) => setCustomerRef(e.target.value)} placeholder="Optional" />
                                </div>
                                <div>
                                    <Label>Phone</Label>
                                    <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Optional" />
                                </div>
                                <div>
                                    <Label>Bill To Address</Label>
                                    <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Optional" />
                                </div>
                                <div className="col-span-2">
                                    <Label>Deliver To Address</Label>
                                    <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Same as Bill To if left blank" />
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">Quote No. will be generated automatically when you save.</p>
                        </div>

                        {worksheetId ? (
                            <>
                                {/* Rates by System Type — sections sharing the same aluminium
                                    system automatically share these rates; a different system
                                    used elsewhere in the quote gets its own independent block. */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                    <div className="border-b pb-2">
                                        <h2 className="font-semibold text-lg text-slate-800">Rates by System Type</h2>
                                        <p className="text-xs text-slate-500 mt-1">Sections using the same system share one rate. A different system gets its own.</p>
                                    </div>
                                    {Object.values(sectionTypeRates).map((typeRate) => (
                                        <div key={typeRate.sectionTypeKey} className="border border-slate-100 rounded-lg p-3 space-y-2">
                                            <div>
                                                <div className="font-semibold text-slate-800 text-sm">{typeRate.sectionTypeName}</div>
                                                <div className="text-xs text-slate-400">Used by: {typeRate.usedBySectionNames.join(", ")}</div>
                                            </div>

                                            {/* Frame/Shutter/Interlock/Track Rail/Mullion + hardware, all in one dense grid */}
                                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                                {Object.keys(typeRate.profileRates).map((category) => (
                                                    <div key={category}>
                                                        <Label className="text-[11px] mb-0.5 leading-tight">{MATERIAL_CATEGORY_LABELS[category as keyof typeof MATERIAL_CATEGORY_LABELS] ?? category} (₹/ft)</Label>
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-sm"
                                                            value={typeRate.profileRates[category] || ""}
                                                            onChange={(e) => setSectionTypeRates({
                                                                ...sectionTypeRates,
                                                                [typeRate.sectionTypeKey]: {
                                                                    ...typeRate,
                                                                    profileRates: { ...typeRate.profileRates, [category]: parseFloat(e.target.value) || 0 },
                                                                },
                                                            })}
                                                        />
                                                    </div>
                                                ))}
                                                <div>
                                                    <Label className="text-[11px] mb-0.5 leading-tight">Mesh (₹)</Label>
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-sm"
                                                        value={typeRate.meshRate || ""}
                                                        onChange={(e) => setSectionTypeRates({
                                                            ...sectionTypeRates,
                                                            [typeRate.sectionTypeKey]: { ...typeRate, meshRate: parseFloat(e.target.value) || 0 },
                                                        })}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-[11px] mb-0.5 leading-tight">Track Cap (₹)</Label>
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-sm"
                                                        value={typeRate.trackCapRate || ""}
                                                        onChange={(e) => setSectionTypeRates({
                                                            ...sectionTypeRates,
                                                            [typeRate.sectionTypeKey]: { ...typeRate, trackCapRate: parseFloat(e.target.value) || 0 },
                                                        })}
                                                    />
                                                </div>
                                            </div>

                                            {rateCard && Object.keys(rateCard.glassRates).length > 0 && (
                                                <div className="flex items-end gap-2">
                                                    <div className="flex-1">
                                                        <Label className="text-[11px] mb-0.5 leading-tight">Glass Type</Label>
                                                        <select
                                                            className="w-full h-8 rounded-md border border-slate-200 px-2 text-sm"
                                                            value={typeRate.glassType}
                                                            onChange={(e) => setSectionTypeRates({
                                                                ...sectionTypeRates,
                                                                [typeRate.sectionTypeKey]: { ...typeRate, glassType: e.target.value, glassRate: rateCard.glassRates[e.target.value] || 0 },
                                                            })}
                                                        >
                                                            {Object.keys(rateCard.glassRates).map((name) => (
                                                                <option key={name} value={name}>{name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="w-24">
                                                        <Label className="text-[11px] mb-0.5 leading-tight">₹/sq.ft</Label>
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-sm"
                                                            value={typeRate.glassRate || ""}
                                                            onChange={(e) => setSectionTypeRates({
                                                                ...sectionTypeRates,
                                                                [typeRate.sectionTypeKey]: { ...typeRate, glassRate: parseFloat(e.target.value) || 0 },
                                                            })}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Sections — read-only summary: diagram + qty/area + computed subtotal, one table row per section */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <h2 className="font-semibold text-lg text-slate-800 border-b p-4 pb-3">Sections</h2>
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-left text-slate-500 text-xs uppercase font-semibold">
                                                <th className="p-2 w-24">Drawing</th>
                                                <th className="p-2">Description</th>
                                                <th className="p-2 text-right w-28">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {totals.sectionBreakdowns.map((section) => (
                                                <tr key={section.sectionId} className="align-top">
                                                    <td className="p-2 w-24">
                                                        <div className="w-20">
                                                            <WindowSchematic
                                                                trackType={section.trackType}
                                                                configuration={section.configuration}
                                                                sections={section.panels}
                                                                widthMm={section.widthMm}
                                                                heightMm={section.heightMm}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="p-2">
                                                        <div className="font-semibold text-slate-800">
                                                            {section.sectionName}{section.qty > 1 ? ` × ${section.qty}` : ""}
                                                        </div>
                                                        <div className="text-slate-500 text-xs">
                                                            {section.sectionTypeName ? `${section.sectionTypeName} — ` : ""}
                                                            {(section.widthMm > 0 || section.heightMm > 0) && `${Math.round(section.widthMm)} × ${Math.round(section.heightMm)} mm — `}
                                                            {section.areaSqFt.toFixed(2)} sq.ft
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-right font-bold text-slate-900 whitespace-nowrap">{formatCurrency(section.subtotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            /* Direct-entry line items */
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h2 className="font-semibold text-lg text-slate-800">Line Items</h2>
                                    <Button type="button" size="sm" variant="outline" onClick={addFreeformItem}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Item
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {freeformItems.map((item) => (
                                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-5">
                                                <Input
                                                    placeholder="Item name"
                                                    value={item.name}
                                                    onChange={(e) => updateFreeformItem(item.id, { name: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Qty"
                                                    value={item.quantity || ""}
                                                    onChange={(e) => updateFreeformItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Input
                                                    placeholder="Unit"
                                                    value={item.unit}
                                                    onChange={(e) => updateFreeformItem(item.id, { unit: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Rate"
                                                    value={item.rate || ""}
                                                    onChange={(e) => updateFreeformItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <button type="button" onClick={() => removeFreeformItem(item.id)} className="col-span-1 text-slate-400 hover:text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Overheads */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h2 className="font-semibold text-lg text-slate-800 border-b pb-2">Costs & Margins</h2>

                            <div className="space-y-2">
                                <Label>Labor Cost</Label>
                                {worksheetId && (
                                    <div className="flex flex-wrap gap-2">
                                        {(Object.keys(LABOR_MODE_LABELS) as LaborMode[]).map((mode) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setLaborMode(mode)}
                                                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${laborMode === mode
                                                    ? "bg-slate-900 text-white border-slate-900"
                                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                    }`}
                                            >
                                                {LABOR_MODE_LABELS[mode]}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {laborMode === "flat" && (
                                    <Input type="number" value={laborFlatAmount} onChange={(e) => setLaborFlatAmount(parseFloat(e.target.value) || 0)} />
                                )}
                                {laborMode === "percentOfMaterial" && (
                                    <div className="flex items-center gap-2">
                                        <Input type="number" value={laborPercent} onChange={(e) => setLaborPercent(parseFloat(e.target.value) || 0)} className="max-w-[120px]" />
                                        <span className="text-sm text-slate-500">% → {formatCurrency(totals.laborCost)}</span>
                                    </div>
                                )}
                                {laborMode === "perSqft" && (
                                    <div className="flex items-center gap-2">
                                        <Input type="number" value={laborRatePerSqft} onChange={(e) => setLaborRatePerSqft(parseFloat(e.target.value) || 0)} className="max-w-[120px]" />
                                        <span className="text-sm text-slate-500">₹/sq.ft → {formatCurrency(totals.laborCost)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <Label>Overhead/Misc</Label>
                                    <Input type="number" value={overheadCost} onChange={(e) => setOverheadCost(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div>
                                    <Label>Discount</Label>
                                    <div className="flex gap-1">
                                        <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} className="flex-1" />
                                        <select
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                                            className="h-10 rounded-md border border-slate-200 px-1 text-sm bg-white"
                                        >
                                            <option value="percent">%</option>
                                            <option value="flat">₹</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <Label>Profit Margin (%)</Label>
                                    <Input type="number" value={profitMargin} onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div>
                                    <Label>Tax / GST (%)</Label>
                                    <Input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} />
                                </div>
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                            <h2 className="font-semibold text-lg text-slate-800 border-b pb-2">Terms & Conditions</h2>
                            <textarea
                                value={termsText}
                                onChange={(e) => setTermsText(e.target.value)}
                                rows={4}
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                                placeholder="One line per term — shown at the bottom of the printed quotation."
                            />
                        </div>
                    </div>

                    {/* Right Column: Live Preview */}
                    <div className="md:col-span-1">
                        <div className="bg-slate-900 text-slate-100 p-6 rounded-xl shadow-lg sticky top-6 space-y-6">
                            <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2">Estimated Total</h2>

                            <div className="space-y-4 text-sm">
                                {worksheetId ? (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Profiles Cost</span>
                                            <span>{formatCurrency(totals.totalProfileCost)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Glass Cost</span>
                                            <span>{formatCurrency(totals.totalGlassCost)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Accessories</span>
                                            <span>{formatCurrency(totals.totalAccessoryCost)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Line Items</span>
                                        <span>{formatCurrency(totals.itemsCost || 0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Labor & Overhead</span>
                                    <span>{formatCurrency(totals.laborCost + Number(overheadCost))}</span>
                                </div>
                                <div className="border-t border-slate-700 pt-2 flex justify-between font-semibold">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(totals.subTotal)}</span>
                                </div>
                                {totals.discountAmount > 0 && (
                                    <div className="flex justify-between text-amber-400">
                                        <span>Discount {discountType === "percent" ? `(${discountValue}%)` : ""}</span>
                                        <span>- {formatCurrency(totals.discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-emerald-400">
                                    <span>Profit ({profitMargin}%)</span>
                                    <span>{formatCurrency(totals.profitAmount)}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>Tax ({taxRate}%)</span>
                                    <span>{formatCurrency(totals.taxAmount)}</span>
                                </div>
                            </div>

                            <div className="border-t-2 border-slate-700 pt-4 mt-2">
                                <div className="text-slate-400 text-xs uppercase mb-1">Final Quotation Amount</div>
                                <div className="text-3xl font-bold text-white">{formatCurrency(totals.finalTotal)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
