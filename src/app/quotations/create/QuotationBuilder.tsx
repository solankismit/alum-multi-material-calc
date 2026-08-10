"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, AREA_SQMM_PER_SQFT } from "@/utils/formatters";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { createQuotation } from "../actions";
import { resolveMaterialCategory, MATERIAL_CATEGORY_LABELS } from "@/utils/materialCategory";
import { calculateLaborCost, type LaborMode } from "@/utils/laborCost";
import {
    computeTotals,
    sumLaborItems,
    DEFAULT_TAX_TYPE,
    type LineItem,
    type SectionPricing,
    type LaborItem,
    type TaxType,
    type CostInclusion,
} from "@/utils/quotationPricing";
import type { MaterialCategory, WindowInput } from "@/types";
import WindowSchematic from "@/components/WindowSchematic";
import { useToast } from "@/components/ui/Toast";

export interface RateMap {
    [key: string]: number;
}

export interface RateCardData {
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

interface HardwareDraftItem {
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
    glassInfo: Array<{ glassSize: { totalArea: number; width?: number; height?: number } }>;
    accessories: { mosquitoCChannel: number; trackCap: number };
    summary?: { wastagePercent?: number; totalMosquitoArea?: number };
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

const TRACK_TYPE_LABELS: Record<string, string> = {
    "2-track": "2-Track",
    "3-track": "3-Track",
    openable: "Openable",
};

const CONFIGURATION_LABELS: Record<string, string> = {
    "all-glass": "All Glass",
    "glass-mosquito": "Glass + Mosquito",
};

function buildConfigLabel(section: {
    sectionTypeName?: string;
    trackType: string;
    configuration: string;
    panels: number;
}): string {
    const parts = [
        section.sectionTypeName,
        TRACK_TYPE_LABELS[section.trackType] ?? section.trackType,
        CONFIGURATION_LABELS[section.configuration] ?? section.configuration,
        section.panels ? `${section.panels} Shutter${section.panels > 1 ? "s" : ""}` : undefined,
    ];
    return parts.filter(Boolean).join(" — ");
}

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
    return totalSqMm / AREA_SQMM_PER_SQFT;
}

/** Derives the initial section-type rate bundles from a loaded worksheet + rate card. */
function buildInitialSectionTypeRates(
    input: WindowInput | null,
    results: SectionResult[],
    card: RateCardData | null
): Record<string, SectionTypeRates> {
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

    return typeRates;
}

export interface QuotationBuilderProps {
    worksheetId: string | null;
    initialRateCard: RateCardData | null;
    initialWorksheet: { input: WindowInput; result: { sectionResults: SectionResult[] } | null } | null;
}

export default function QuotationBuilder({ worksheetId, initialRateCard, initialWorksheet }: QuotationBuilderProps) {
    const router = useRouter();
    const { toast } = useToast();

    const [saving, setSaving] = useState(false);
    const initialResults = initialWorksheet?.result?.sectionResults ?? [];
    const [sectionResults] = useState<SectionResult[]>(initialResults);
    const [windowInput] = useState<WindowInput | null>(initialWorksheet?.input ?? null);
    const [overallAreaSqFt] = useState<number>(computeOverallAreaSqFt(initialWorksheet?.input?.sections));
    const [rateCard] = useState<RateCardData | null>(initialRateCard);

    // Pricing state — seeded from the rate card once it loads. Keyed by
    // section-type: identical systems share one rate bundle automatically,
    // different systems get independent ones.
    const [sectionTypeRates, setSectionTypeRates] = useState<Record<string, SectionTypeRates>>(
        buildInitialSectionTypeRates(initialWorksheet?.input ?? null, initialResults, initialRateCard)
    );

    // Direct-entry (no worksheet) line items
    const [freeformItems, setFreeformItems] = useState<FreeformItem[]>([
        { id: crypto.randomUUID(), name: "", quantity: 1, unit: "nos", rate: 0 },
    ]);

    // Extra hardware/mesh line items added per section, on top of the
    // auto-computed mesh/track-cap accessories (e.g. rollers, handles, locks).
    const [extraHardware, setExtraHardware] = useState<Record<string, HardwareDraftItem[]>>({});

    // Overheads — seeded from rate card defaults. Freeform quotations have no
    // material-cost/area basis for the percent/per-sqft labor modes — always
    // fall back to flat there.
    const [laborMode, setLaborMode] = useState<LaborMode>(
        !worksheetId ? "flat" : initialRateCard?.laborMode ?? "flat"
    );
    const [laborFlatAmount, setLaborFlatAmount] = useState<number>(initialRateCard?.laborDefault ?? 0);
    const [laborPercent, setLaborPercent] = useState<number>(initialRateCard?.laborPercent ?? 0);
    const [laborRatePerSqft, setLaborRatePerSqft] = useState<number>(initialRateCard?.laborRatePerSqft ?? 0);
    const [laborItemized, setLaborItemized] = useState(false);
    const [laborItems, setLaborItems] = useState<LaborItem[]>([
        { name: "Cutting & Assembly", amount: 0 },
        { name: "Glazing", amount: 0 },
        { name: "Hardware Fitting", amount: 0 },
    ]);
    const [overheadCost, setOverheadCost] = useState<number>(initialRateCard?.overheadDefault ?? 0);
    const [profitMargin, setProfitMargin] = useState<number>(initialRateCard?.profitMarginDefault ?? 0);
    const [taxRate, setTaxRate] = useState<number>(initialRateCard?.taxRateDefault ?? 0);
    const [taxType, setTaxType] = useState<TaxType>(DEFAULT_TAX_TYPE);
    const [discountType, setDiscountType] = useState<DiscountType>("percent");
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [termsText, setTermsText] = useState<string>(initialRateCard?.termsText ?? "");

    const [installationIncluded, setInstallationIncluded] = useState(false);
    const [installationAmount, setInstallationAmount] = useState(0);
    const [installationNote, setInstallationNote] = useState("");
    const [transportationIncluded, setTransportationIncluded] = useState(false);
    const [transportationAmount, setTransportationAmount] = useState(0);
    const [transportationNote, setTransportationNote] = useState("");

    // Metadata
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientAddress, setClientAddress] = useState("");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [customerRef, setCustomerRef] = useState("");

    const installation: CostInclusion = { included: installationIncluded, amount: installationAmount, note: installationNote };
    const transportation: CostInclusion = { included: transportationIncluded, amount: transportationAmount, note: transportationNote };

    const totals = useMemo(() => {
        if (worksheetId) {
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
                const firstGlassSize = section.glassInfo[0]?.glassSize;
                const glass: LineItem[] = sectionGlassAreaSqFt > 0
                    ? [{
                        name: typeRates?.glassType || "Glass",
                        area: sectionGlassAreaSqFt,
                        unit: "sqft",
                        rate: typeRates?.glassRate || 0,
                        cost: sectionGlassAreaSqFt * (typeRates?.glassRate || 0),
                        widthMm: firstGlassSize?.width,
                        heightMm: firstGlassSize?.height,
                    }]
                    : [];

                const meshRate = typeRates?.meshRate || 0;
                const trackCapRate = typeRates?.trackCapRate || 0;
                const meshName = inputSection?.mosquitoMeshGrade
                    ? `Mosquito Mesh (${inputSection.mosquitoMeshGrade})`
                    : "Mosquito Mesh / C-Channel";
                const meshAreaSqFt = (section.summary?.totalMosquitoArea || 0) / AREA_SQMM_PER_SQFT;
                const extraHardwareItems: LineItem[] = (extraHardware[section.sectionId] || [])
                    .filter((item) => item.name.trim())
                    .map((item) => ({ name: item.name, quantity: item.quantity, unit: item.unit, rate: item.rate, cost: item.quantity * item.rate }));

                const accessories: LineItem[] = [
                    ...(section.accessories.mosquitoCChannel > 0
                        ? [{ name: meshName, quantity: section.accessories.mosquitoCChannel, unit: "nos", area: meshAreaSqFt || undefined, rate: meshRate, cost: section.accessories.mosquitoCChannel * meshRate }]
                        : []),
                    ...(section.accessories.trackCap > 0 ? [{ name: "Track Cap", quantity: section.accessories.trackCap, unit: "nos", rate: trackCapRate, cost: section.accessories.trackCap * trackCapRate }] : []),
                    ...extraHardwareItems,
                ];

                const subtotal =
                    profiles.reduce((s, p) => s + p.cost, 0) +
                    glass.reduce((s, g) => s + g.cost, 0) +
                    accessories.reduce((s, a) => s + a.cost, 0);

                return {
                    sectionId: section.sectionId,
                    sectionName: section.sectionName,
                    sectionTypeName: section.sectionTypeName,
                    configLabel: buildConfigLabel({
                        sectionTypeName: section.sectionTypeName,
                        trackType: isOpenable ? "openable" : (inputSection?.trackType || "2-track"),
                        configuration: inputSection?.configuration || "all-glass",
                        panels: isOpenable ? (panelsRaw as number) : 2,
                    }),
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
                    materialWastagePercent: section.summary?.wastagePercent,
                };
            });

            const totalProfileCost = sectionBreakdowns.reduce((sum, s) => sum + s.profiles.reduce((ss, p) => ss + p.cost, 0), 0);
            const totalGlassAreaSqFt = sectionBreakdowns.reduce((sum, s) => sum + s.glass.reduce((ss, g) => ss + (g.area || 0), 0), 0);
            const totalGlassCost = sectionBreakdowns.reduce((sum, s) => sum + s.glass.reduce((ss, g) => ss + g.cost, 0), 0);
            const meshCount = sectionResults.reduce((sum, s) => sum + s.accessories.mosquitoCChannel, 0);
            const trackCapCount = sectionResults.reduce((sum, s) => sum + s.accessories.trackCap, 0);
            const totalAccessoryCost = sectionBreakdowns.reduce((sum, s) => sum + s.accessories.reduce((ss, a) => ss + a.cost, 0), 0);

            const materialCost = totalProfileCost + totalGlassCost + totalAccessoryCost;
            const laborCost = laborItemized
                ? sumLaborItems(laborItems)
                : calculateLaborCost(
                    laborMode,
                    { flatAmount: laborFlatAmount, percent: laborPercent, ratePerSqft: laborRatePerSqft },
                    { materialCost, totalAreaSqFt: overallAreaSqFt }
                );

            const computed = computeTotals({
                materialCost,
                laborCost,
                overheadCost: Number(overheadCost),
                installation,
                transportation,
                discountType,
                discountValue,
                profitMarginPercent: profitMargin,
                taxRatePercent: taxRate,
            });

            return {
                sectionBreakdowns,
                totalProfileCost,
                totalGlassAreaSqFt,
                overallAreaSqFt,
                totalGlassCost,
                meshCount,
                trackCapCount,
                totalAccessoryCost,
                itemsCost: 0,
                laborCost,
                ...computed,
            };
        }

        // Direct-entry mode — only flat labor makes sense (no material cost/area basis)
        const itemsCost = freeformItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
        const laborCost = laborItemized
            ? sumLaborItems(laborItems)
            : calculateLaborCost(
                "flat",
                { flatAmount: laborFlatAmount, percent: laborPercent, ratePerSqft: laborRatePerSqft },
                { materialCost: itemsCost, totalAreaSqFt: 0 }
            );

        const computed = computeTotals({
            materialCost: itemsCost,
            laborCost,
            overheadCost: Number(overheadCost),
            installation,
            transportation,
            discountType,
            discountValue,
            profitMarginPercent: profitMargin,
            taxRatePercent: taxRate,
        });

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
            ...computed,
        };
    }, [
        worksheetId,
        sectionResults,
        windowInput,
        sectionTypeRates,
        extraHardware,
        freeformItems,
        laborMode,
        laborFlatAmount,
        laborPercent,
        laborRatePerSqft,
        laborItemized,
        laborItems,
        overheadCost,
        profitMargin,
        taxRate,
        discountType,
        discountValue,
        overallAreaSqFt,
        installation,
        transportation,
    ]);

    const addFreeformItem = () => {
        setFreeformItems([...freeformItems, { id: crypto.randomUUID(), name: "", quantity: 1, unit: "nos", rate: 0 }]);
    };

    const updateFreeformItem = (id: string, updates: Partial<FreeformItem>) => {
        setFreeformItems(freeformItems.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    };

    const removeFreeformItem = (id: string) => {
        setFreeformItems(freeformItems.filter((item) => item.id !== id));
    };

    const addHardwareItem = (sectionId: string) => {
        setExtraHardware({
            ...extraHardware,
            [sectionId]: [...(extraHardware[sectionId] || []), { id: crypto.randomUUID(), name: "", quantity: 1, unit: "nos", rate: 0 }],
        });
    };

    const updateHardwareItem = (sectionId: string, itemId: string, updates: Partial<HardwareDraftItem>) => {
        setExtraHardware({
            ...extraHardware,
            [sectionId]: (extraHardware[sectionId] || []).map((item) => {
                if (item.id !== itemId) return item;
                const next = { ...item, ...updates };
                // Auto-fill the rate from the rate card the first time a known hardware name is typed.
                if (updates.name !== undefined && next.rate === 0 && rateCard?.hardwareRates[updates.name] !== undefined) {
                    next.rate = rateCard.hardwareRates[updates.name];
                }
                return next;
            }),
        });
    };

    const removeHardwareItem = (sectionId: string, itemId: string) => {
        setExtraHardware({
            ...extraHardware,
            [sectionId]: (extraHardware[sectionId] || []).filter((item) => item.id !== itemId),
        });
    };

    const addLaborItem = () => {
        setLaborItems([...laborItems, { name: "", amount: 0 }]);
    };

    const updateLaborItem = (index: number, updates: Partial<LaborItem>) => {
        setLaborItems(laborItems.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
    };

    const removeLaborItem = (index: number) => {
        setLaborItems(laborItems.filter((_, idx) => idx !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const laborBreakdown = laborItemized
                ? { mode: "itemized" as const, items: laborItems.filter((item) => item.name.trim()) }
                : { mode: laborMode, percent: laborPercent, ratePerSqft: laborRatePerSqft };

            const pricingData = worksheetId
                ? {
                    sections: totals.sectionBreakdowns,
                    labor: totals.laborCost,
                    laborBreakdown,
                    overhead: overheadCost,
                    installation,
                    transportation,
                    discount: { type: discountType, value: discountValue, amount: totals.discountAmount },
                    profitMargin,
                    taxRate,
                    taxType,
                    termsText,
                }
                : {
                    profiles: [],
                    glass: [],
                    accessories: freeformItems
                        .filter((item) => item.name.trim())
                        .map((item) => ({ name: item.name, quantity: item.quantity, unit: item.unit, rate: item.rate, cost: item.quantity * item.rate })),
                    labor: totals.laborCost,
                    laborBreakdown,
                    overhead: overheadCost,
                    installation,
                    transportation,
                    discount: { type: discountType, value: discountValue, amount: totals.discountAmount },
                    profitMargin,
                    taxRate,
                    taxType,
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
                toast("Quotation created.");
                router.push(`/quotations/${res.id}`);
            } else {
                toast("Failed to save: " + res.error, "error");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface-muted p-6 md:p-8 font-sans">
            <datalist id="hardware-rate-suggestions">
                {Object.keys(rateCard?.hardwareRates || {}).map((name) => (
                    <option key={name} value={name} />
                ))}
            </datalist>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Link href="/dashboard">
                        <Button variant="ghost">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-text">Create Quotation</h1>
                    <Button onClick={handleSave} isLoading={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Generate Quote
                    </Button>
                </div>

                {!rateCard && (
                    <div className="bg-warning-surface border border-warning-border text-warning text-sm rounded-lg p-3">
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
                        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-4">
                            <h2 className="font-semibold text-lg text-text border-b pb-2">Client Details</h2>
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
                            <p className="text-xs text-text-muted">Quote No. will be generated automatically when you save.</p>
                        </div>

                        {worksheetId ? (
                            <>
                                {/* Rates by System Type — sections sharing the same aluminium
                                    system automatically share these rates; a different system
                                    used elsewhere in the quote gets its own independent block. */}
                                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-3">
                                    <div className="border-b pb-2">
                                        <h2 className="font-semibold text-lg text-text">Rates by System Type</h2>
                                        <p className="text-xs text-text-muted mt-1">Sections using the same system share one rate. A different system gets its own.</p>
                                    </div>
                                    {Object.values(sectionTypeRates).map((typeRate) => (
                                        <div key={typeRate.sectionTypeKey} className="border border-border rounded-lg p-3 space-y-2">
                                            <div>
                                                <div className="font-semibold text-text text-sm">{typeRate.sectionTypeName}</div>
                                                <div className="text-xs text-text-muted">Used by: {typeRate.usedBySectionNames.join(", ")}</div>
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
                                                            className="w-full h-8 rounded-md border border-border px-2 text-sm"
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

                                {/* Sections — diagram + qty/area + computed subtotal, one row per
                                    section, plus an inline editor for extra hardware/mesh items. */}
                                <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                                    <h2 className="font-semibold text-lg text-text border-b p-4 pb-3">Sections</h2>
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-surface-muted text-left text-text-muted text-xs uppercase font-semibold">
                                                <th className="p-2 w-24">Drawing</th>
                                                <th className="p-2">Description</th>
                                                <th className="p-2 text-right w-28">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
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
                                                        <div className="font-semibold text-text">
                                                            {section.sectionName}{section.qty > 1 ? ` × ${section.qty}` : ""}
                                                        </div>
                                                        <div className="text-text-muted text-xs">
                                                            {section.configLabel ? `${section.configLabel} — ` : ""}
                                                            {(section.widthMm > 0 || section.heightMm > 0) && `${Math.round(section.widthMm)} × ${Math.round(section.heightMm)} mm — `}
                                                            {section.areaSqFt.toFixed(2)} sq.ft
                                                            {typeof section.materialWastagePercent === "number" && ` — ${section.materialWastagePercent.toFixed(1)}% wastage`}
                                                        </div>

                                                        {/* Extra hardware / mesh items for this section */}
                                                        <div className="mt-2 space-y-1">
                                                            {(extraHardware[section.sectionId] || []).map((item) => (
                                                                <div key={item.id} className="grid grid-cols-12 gap-1 items-center">
                                                                    <div className="col-span-5">
                                                                        <Input
                                                                            list="hardware-rate-suggestions"
                                                                            placeholder="Hardware name (e.g. Roller, Handle, Lock)"
                                                                            className="h-7 text-xs"
                                                                            value={item.name}
                                                                            onChange={(e) => updateHardwareItem(section.sectionId, item.id, { name: e.target.value })}
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="Qty"
                                                                            className="h-7 text-xs"
                                                                            value={item.quantity || ""}
                                                                            onChange={(e) => updateHardwareItem(section.sectionId, item.id, { quantity: parseFloat(e.target.value) || 0 })}
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <Input
                                                                            placeholder="Unit"
                                                                            className="h-7 text-xs"
                                                                            value={item.unit}
                                                                            onChange={(e) => updateHardwareItem(section.sectionId, item.id, { unit: e.target.value })}
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="Rate"
                                                                            className="h-7 text-xs"
                                                                            value={item.rate || ""}
                                                                            onChange={(e) => updateHardwareItem(section.sectionId, item.id, { rate: parseFloat(e.target.value) || 0 })}
                                                                        />
                                                                    </div>
                                                                    <button type="button" onClick={() => removeHardwareItem(section.sectionId, item.id)} className="col-span-1 text-text-muted hover:text-danger">
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                type="button"
                                                                onClick={() => addHardwareItem(section.sectionId)}
                                                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                                            >
                                                                <Plus className="w-3 h-3" /> Add hardware
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-right font-bold text-text whitespace-nowrap">{formatCurrency(section.subtotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            /* Direct-entry line items */
                            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h2 className="font-semibold text-lg text-text">Line Items</h2>
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
                                            <button type="button" onClick={() => removeFreeformItem(item.id)} className="col-span-1 text-text-muted hover:text-danger">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Overheads */}
                        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-4">
                            <h2 className="font-semibold text-lg text-text border-b pb-2">Costs & Margins</h2>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Labor Cost</Label>
                                    <label className="flex items-center gap-1.5 text-xs text-text-muted">
                                        <input type="checkbox" checked={laborItemized} onChange={(e) => setLaborItemized(e.target.checked)} />
                                        Itemize by activity
                                    </label>
                                </div>

                                {laborItemized ? (
                                    <div className="space-y-2">
                                        {laborItems.map((item, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                                <div className="col-span-7">
                                                    <Input
                                                        placeholder="Activity (e.g. Cutting, Glazing)"
                                                        value={item.name}
                                                        onChange={(e) => updateLaborItem(idx, { name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="col-span-4">
                                                    <Input
                                                        type="number"
                                                        placeholder="₹"
                                                        value={item.amount || ""}
                                                        onChange={(e) => updateLaborItem(idx, { amount: parseFloat(e.target.value) || 0 })}
                                                    />
                                                </div>
                                                <button type="button" onClick={() => removeLaborItem(idx)} className="col-span-1 text-text-muted hover:text-danger">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <Button type="button" size="sm" variant="outline" onClick={addLaborItem}>
                                            <Plus className="w-4 h-4 mr-1" /> Add Activity
                                        </Button>
                                        <p className="text-xs text-text-muted">Total labour: {formatCurrency(totals.laborCost)}</p>
                                    </div>
                                ) : (
                                    <>
                                        {worksheetId && (
                                            <div className="flex flex-wrap gap-2">
                                                {(Object.keys(LABOR_MODE_LABELS) as LaborMode[]).map((mode) => (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        onClick={() => setLaborMode(mode)}
                                                        className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${laborMode === mode
                                                            ? "bg-text text-surface border-text"
                                                            : "bg-surface text-text-muted border-border hover:bg-surface-muted"
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
                                                <span className="text-sm text-text-muted">% → {formatCurrency(totals.laborCost)}</span>
                                            </div>
                                        )}
                                        {laborMode === "perSqft" && (
                                            <div className="flex items-center gap-2">
                                                <Input type="number" value={laborRatePerSqft} onChange={(e) => setLaborRatePerSqft(parseFloat(e.target.value) || 0)} className="max-w-[120px]" />
                                                <span className="text-sm text-text-muted">₹/sq.ft → {formatCurrency(totals.laborCost)}</span>
                                            </div>
                                        )}
                                    </>
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
                                            className="h-10 rounded-md border border-border px-1 text-sm bg-surface"
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
                                    <div className="flex gap-1">
                                        <Input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} className="flex-1" />
                                        <select
                                            value={taxType}
                                            onChange={(e) => setTaxType(e.target.value as TaxType)}
                                            className="h-10 rounded-md border border-border px-1 text-xs bg-surface"
                                            title="Intra-state splits into CGST+SGST; inter-state uses IGST"
                                        >
                                            <option value="CGST_SGST">CGST+SGST</option>
                                            <option value="IGST">IGST</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-text">
                                        <input type="checkbox" checked={installationIncluded} onChange={(e) => setInstallationIncluded(e.target.checked)} />
                                        Installation Included
                                    </label>
                                    {installationIncluded && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input type="number" placeholder="Amount ₹" value={installationAmount || ""} onChange={(e) => setInstallationAmount(parseFloat(e.target.value) || 0)} />
                                            <Input placeholder="Note (optional)" value={installationNote} onChange={(e) => setInstallationNote(e.target.value)} />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-text">
                                        <input type="checkbox" checked={transportationIncluded} onChange={(e) => setTransportationIncluded(e.target.checked)} />
                                        Transportation Included
                                    </label>
                                    {transportationIncluded && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input type="number" placeholder="Amount ₹" value={transportationAmount || ""} onChange={(e) => setTransportationAmount(parseFloat(e.target.value) || 0)} />
                                            <Input placeholder="Note (optional)" value={transportationNote} onChange={(e) => setTransportationNote(e.target.value)} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-3">
                            <h2 className="font-semibold text-lg text-text border-b pb-2">Terms & Conditions</h2>
                            <textarea
                                value={termsText}
                                onChange={(e) => setTermsText(e.target.value)}
                                rows={4}
                                className="w-full rounded-md border border-border px-3 py-2 text-sm text-text"
                                placeholder="One line per term — shown at the bottom of the printed quotation."
                            />
                        </div>
                    </div>

                    {/* Right Column: Live Preview — ordered first on mobile so the
                        running total is visible near the top instead of after the
                        entire (often long) form. */}
                    <div className="md:col-span-1 order-first md:order-none">
                        <div className="bg-surface-inverse text-text-inverse p-6 rounded-xl shadow-lg sticky top-6 space-y-6">
                            <h2 className="text-xl font-bold text-text-inverse border-b border-white/20 pb-2">Estimated Total</h2>
                            <p className="text-xs text-text-inverse/50 -mt-4">Internal figures — this breakdown is never shown to the customer.</p>

                            <div className="space-y-4 text-sm">
                                {worksheetId ? (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-text-inverse/70">Profiles Cost</span>
                                            <span>{formatCurrency(totals.totalProfileCost)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-inverse/70">Glass Cost</span>
                                            <span>{formatCurrency(totals.totalGlassCost)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-inverse/70">Accessories</span>
                                            <span>{formatCurrency(totals.totalAccessoryCost)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-between">
                                        <span className="text-text-inverse/70">Line Items</span>
                                        <span>{formatCurrency(totals.itemsCost || 0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-text-inverse/70">Labor & Overhead</span>
                                    <span>{formatCurrency(totals.laborCost + Number(overheadCost))}</span>
                                </div>
                                {installationIncluded && installationAmount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-text-inverse/70">Installation</span>
                                        <span>{formatCurrency(installationAmount)}</span>
                                    </div>
                                )}
                                {transportationIncluded && transportationAmount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-text-inverse/70">Transportation</span>
                                        <span>{formatCurrency(transportationAmount)}</span>
                                    </div>
                                )}
                                <div className="border-t border-white/20 pt-2 flex justify-between font-semibold">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(totals.subTotal)}</span>
                                </div>
                                {totals.discountAmount > 0 && (
                                    <div className="flex justify-between text-warning">
                                        <span>Discount {discountType === "percent" ? `(${discountValue}%)` : ""}</span>
                                        <span>- {formatCurrency(totals.discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-success">
                                    <span>Profit ({profitMargin}%)</span>
                                    <span>{formatCurrency(totals.profitAmount)}</span>
                                </div>
                                <div className="flex justify-between text-text-inverse/70">
                                    <span>Tax ({taxRate}%, {taxType === "IGST" ? "IGST" : "CGST+SGST"})</span>
                                    <span>{formatCurrency(totals.taxAmount)}</span>
                                </div>
                            </div>

                            <div className="border-t-2 border-white/20 pt-4 mt-2">
                                <div className="text-text-inverse/70 text-xs uppercase mb-1">Final Quotation Amount</div>
                                <div className="text-3xl font-bold text-text-inverse">{formatCurrency(totals.finalTotal)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
