"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, AREA_SQMM_PER_SQFT } from "@/utils/formatters";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ArrowLeft, Save, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { createQuotation, updateQuotation } from "../actions";
import { resolveMaterialCategory, MATERIAL_CATEGORY_LABELS } from "@/utils/materialCategory";
import { calculateLaborCost, type LaborMode } from "@/utils/laborCost";
import {
    computeTotals,
    sumLaborItems,
    mergeItemDetails,
    DEFAULT_TAX_TYPE,
    type LineItem,
    type SectionPricing,
    type LaborItem,
    type TaxType,
    type CostInclusion,
    type PricingData,
    type ItemPosition,
    type ItemSpecDetails,
} from "@/utils/quotationPricing";
import type { MaterialCategory, WindowInput } from "@/types";
import WindowSchematic from "@/components/WindowSchematic";
import { useToast } from "@/components/ui/Toast";
import ManualSectionForm, { type ManualSection, type ManualHardwareItem } from "./ManualSectionForm";

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

export interface InitialQuotation {
    id: string;
    pricingData: PricingData;
    clientName: string;
    clientPhone: string;
    clientAddress: string;
    deliveryAddress: string;
    customerRef: string;
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

/** Derives the initial section-type rate bundles from a loaded worksheet + rate card,
 * recovering previously-saved rates (matched by section-type name) when editing. */
function buildInitialSectionTypeRates(
    input: WindowInput | null,
    results: SectionResult[],
    card: RateCardData | null,
    existingPricing?: PricingData | null
): Record<string, SectionTypeRates> {
    const firstGlassType = card ? Object.keys(card.glassRates)[0] : undefined;
    const typeRates: Record<string, SectionTypeRates> = {};

    const findSaved = (sectionTypeName: string) =>
        existingPricing?.sections?.find((s) => (s.sectionTypeName || s.sectionName) === sectionTypeName);

    results.forEach((section) => {
        const inputSection = input?.sections.find((s) => s.id === section.sectionId);
        const key = getSectionTypeKey(section, inputSection?.sectionTypeId);
        const typeName = section.sectionTypeName || section.sectionName;

        if (!typeRates[key]) {
            const saved = findSaved(typeName);
            const savedGlass = saved?.glass?.[0];
            const savedMesh = saved?.accessories?.find((a) => a.area !== undefined);
            const savedTrackCap = saved?.accessories?.find((a) => a.name === "Track Cap");

            typeRates[key] = {
                sectionTypeKey: key,
                sectionTypeName: typeName,
                usedBySectionNames: [],
                profileRates: {},
                glassType: savedGlass?.name || firstGlassType || "",
                glassRate: savedGlass?.rate ?? (firstGlassType && card ? card.glassRates[firstGlassType] : 0),
                meshRate: savedMesh?.rate ?? (card?.hardwareRates["Mosquito Mesh"] ?? card?.hardwareRates["C-Channel"] ?? 0),
                trackCapRate: savedTrackCap?.rate ?? (card?.hardwareRates["Track Cap"] ?? 0),
            };
        }
        typeRates[key].usedBySectionNames.push(section.sectionName);

        const saved = findSaved(typeName);
        section.materials.forEach((mat) => {
            const category = resolveMaterialCategory(mat);
            if (typeRates[key].profileRates[category] === undefined) {
                const label = MATERIAL_CATEGORY_LABELS[category as keyof typeof MATERIAL_CATEGORY_LABELS] ?? category;
                const savedLine = saved?.profiles?.find((p) => p.name === label);
                typeRates[key].profileRates[category] = savedLine?.rate ?? (card?.profileRates?.[category] ?? card?.profileRatePerFt ?? 0);
            }
        });
    });

    return typeRates;
}

let manualSectionCounter = 0;
function createEmptyManualSection(rateCard: RateCardData | null): ManualSection {
    manualSectionCounter += 1;
    const firstGlassType = rateCard ? Object.keys(rateCard.glassRates)[0] : undefined;
    return {
        id: crypto.randomUUID(),
        name: `Section ${manualSectionCounter}`,
        trackType: "2-track",
        configuration: "all-glass",
        height: null,
        width: null,
        quantity: 1,
        glassType: firstGlassType || "",
        glassRate: firstGlassType && rateCard ? rateCard.glassRates[firstGlassType] : 0,
        frameRatePerSqft: 0,
    };
}

/** Reconstructs editable manual sections from a previously-saved quotation's pricingData. */
function buildInitialManualSections(pricing: PricingData | null | undefined, rateCard: RateCardData | null): ManualSection[] {
    if (pricing?.sections && pricing.sections.length > 0) {
        return pricing.sections.map((s) => ({
            id: s.sectionId,
            name: s.sectionName,
            trackType: s.trackType === "3-track" ? "3-track" : "2-track",
            configuration: s.configuration === "glass-mosquito" ? "glass-mosquito" : "all-glass",
            height: s.heightMm || null,
            width: s.widthMm || null,
            quantity: s.qty || null,
            glassType: s.glass[0]?.name || "",
            glassRate: s.glass[0]?.rate || 0,
            frameRatePerSqft: s.profiles[0]?.rate || 0,
            position: s.position,
            details: s.details,
        }));
    }
    return [createEmptyManualSection(rateCard)];
}

/** Derives the initial per-section-type Details defaults from a saved quotation, matched by
 * section-type name — mirrors buildInitialSectionTypeRates but for the non-priced spec fields.
 * Keyed the same way as sectionTypeRates, so "same system = same details" holds here too. */
function buildInitialSectionTypeDetails(
    input: WindowInput | null,
    results: SectionResult[],
    existingPricing?: PricingData | null
): Record<string, ItemSpecDetails> {
    const typeDetails: Record<string, ItemSpecDetails> = {};
    results.forEach((section) => {
        const inputSection = input?.sections.find((s) => s.id === section.sectionId);
        const key = getSectionTypeKey(section, inputSection?.sectionTypeId);
        if (typeDetails[key]) return;
        const typeName = section.sectionTypeName || section.sectionName;
        const saved = existingPricing?.sections?.find((s) => (s.sectionTypeName || s.sectionName) === typeName);
        if (saved?.details) {
            typeDetails[key] = saved.details;
        }
    });
    return typeDetails;
}

/** Reconstructs per-item Position values for worksheet sections from a saved quotation, keyed by sectionId. */
function buildInitialItemPositions(existingPricing?: PricingData | null): Record<string, ItemPosition> {
    const positions: Record<string, ItemPosition> = {};
    existingPricing?.sections?.forEach((s) => {
        if (s.position) positions[s.sectionId] = s.position;
    });
    return positions;
}

export interface QuotationBuilderProps {
    worksheetId: string | null;
    initialRateCard: RateCardData | null;
    initialWorksheet: { input: WindowInput; result: { sectionResults: SectionResult[] } | null } | null;
    initialQuotation?: InitialQuotation | null;
}

export default function QuotationBuilder({ worksheetId, initialRateCard, initialWorksheet, initialQuotation }: QuotationBuilderProps) {
    const router = useRouter();
    const { toast } = useToast();

    const isEditMode = !!initialQuotation;
    const [quotationId, setQuotationId] = useState<string | undefined>(initialQuotation?.id);
    const seedPricing = initialQuotation?.pricingData ?? null;

    const [saving, setSaving] = useState<"draft" | "final" | null>(null);
    const initialResults = initialWorksheet?.result?.sectionResults ?? [];
    const [sectionResults] = useState<SectionResult[]>(initialResults);
    const [windowInput] = useState<WindowInput | null>(initialWorksheet?.input ?? null);
    const [overallAreaSqFt] = useState<number>(computeOverallAreaSqFt(initialWorksheet?.input?.sections));
    const [rateCard] = useState<RateCardData | null>(initialRateCard);

    // Pricing state — seeded from the rate card once it loads, or from the
    // saved quotation's own rates when editing. Keyed by section-type:
    // identical systems share one rate bundle automatically, different
    // systems get independent ones.
    const [sectionTypeRates, setSectionTypeRates] = useState<Record<string, SectionTypeRates>>(
        buildInitialSectionTypeRates(initialWorksheet?.input ?? null, initialResults, initialRateCard, seedPricing)
    );

    // Details (color, glass, mesh, handle, locking, hinge, notes) shared by every
    // section using the same system — same grouping key as sectionTypeRates, so
    // "same system = same spec" holds for both price and description. Position
    // (where the window goes on site) and a per-item Details override live per
    // section-id instead, since those genuinely vary window to window.
    const [sectionTypeDetails, setSectionTypeDetails] = useState<Record<string, ItemSpecDetails>>(
        buildInitialSectionTypeDetails(initialWorksheet?.input ?? null, initialResults, seedPricing)
    );
    const [itemPositions, setItemPositions] = useState<Record<string, ItemPosition>>(
        buildInitialItemPositions(seedPricing)
    );
    const [itemDetailOverrides, setItemDetailOverrides] = useState<Record<string, ItemSpecDetails>>({});
    const [expandedDetailItems, setExpandedDetailItems] = useState<Record<string, boolean>>({});

    // Manual (no-worksheet) sections — each has its own dimensions, track
    // type/configuration, glass rate and a flat frame rate. Reconstructed
    // from the saved quotation when editing a manual quote.
    const [manualSections, setManualSections] = useState<ManualSection[]>(
        !worksheetId ? buildInitialManualSections(seedPricing, initialRateCard) : []
    );
    const [manualUnitMode, setManualUnitMode] = useState<"mm" | "ft">("mm");

    // Extra hardware/mesh line items added per section (worksheet sections),
    // on top of the auto-computed mesh/track-cap accessories, or per manual
    // section (where it's the section's only accessory source). Keyed by
    // section id, shared across both modes since ids never collide.
    const [extraHardware, setExtraHardware] = useState<Record<string, HardwareDraftItem[]>>(
        !worksheetId && seedPricing?.sections
            ? seedPricing.sections.reduce<Record<string, HardwareDraftItem[]>>((acc, s) => {
                if (s.accessories.length > 0) {
                    acc[s.sectionId] = s.accessories.map((a) => ({
                        id: crypto.randomUUID(),
                        name: a.name,
                        quantity: a.quantity || 0,
                        unit: a.unit,
                        rate: a.rate,
                    }));
                }
                return acc;
            }, {})
            : {}
    );

    // Overheads — seeded from the saved quotation when editing, else from
    // rate card defaults. Freeform quotations have no material-cost/area
    // basis for the percent/per-sqft labor modes — always fall back to flat.
    const initialLaborMode: LaborMode =
        seedPricing?.laborBreakdown && seedPricing.laborBreakdown.mode !== "itemized"
            ? seedPricing.laborBreakdown.mode
            : !worksheetId ? "flat" : initialRateCard?.laborMode ?? "flat";
    const [laborMode, setLaborMode] = useState<LaborMode>(initialLaborMode);
    const [laborFlatAmount, setLaborFlatAmount] = useState<number>(
        seedPricing && initialLaborMode === "flat" ? seedPricing.labor || 0 : initialRateCard?.laborDefault ?? 0
    );
    const [laborPercent, setLaborPercent] = useState<number>(
        seedPricing?.laborBreakdown && seedPricing.laborBreakdown.mode !== "itemized" ? seedPricing.laborBreakdown.percent : initialRateCard?.laborPercent ?? 0
    );
    const [laborRatePerSqft, setLaborRatePerSqft] = useState<number>(
        seedPricing?.laborBreakdown && seedPricing.laborBreakdown.mode !== "itemized" ? seedPricing.laborBreakdown.ratePerSqft : initialRateCard?.laborRatePerSqft ?? 0
    );
    const [laborItemized, setLaborItemized] = useState(seedPricing?.laborBreakdown?.mode === "itemized");
    const [laborItems, setLaborItems] = useState<LaborItem[]>(
        seedPricing?.laborBreakdown?.mode === "itemized" && seedPricing.laborBreakdown.items.length > 0
            ? seedPricing.laborBreakdown.items
            : [
                { name: "Cutting & Assembly", amount: 0 },
                { name: "Glazing", amount: 0 },
                { name: "Hardware Fitting", amount: 0 },
            ]
    );
    const [overheadCost, setOverheadCost] = useState<number>(seedPricing?.overhead ?? initialRateCard?.overheadDefault ?? 0);
    const [profitMargin, setProfitMargin] = useState<number>(seedPricing?.profitMargin ?? initialRateCard?.profitMarginDefault ?? 0);
    const [taxRate, setTaxRate] = useState<number>(seedPricing?.taxRate ?? initialRateCard?.taxRateDefault ?? 0);
    const [taxType, setTaxType] = useState<TaxType>(seedPricing?.taxType ?? DEFAULT_TAX_TYPE);
    const [discountType, setDiscountType] = useState<DiscountType>(seedPricing?.discount?.type ?? "percent");
    const [discountValue, setDiscountValue] = useState<number>(seedPricing?.discount?.value ?? 0);
    const [termsText, setTermsText] = useState<string>(seedPricing?.termsText ?? initialRateCard?.termsText ?? "");

    const [installationIncluded, setInstallationIncluded] = useState(seedPricing?.installation?.included ?? false);
    const [installationAmount, setInstallationAmount] = useState(seedPricing?.installation?.amount ?? 0);
    const [installationNote, setInstallationNote] = useState(seedPricing?.installation?.note ?? "");
    const [transportationIncluded, setTransportationIncluded] = useState(seedPricing?.transportation?.included ?? false);
    const [transportationAmount, setTransportationAmount] = useState(seedPricing?.transportation?.amount ?? 0);
    const [transportationNote, setTransportationNote] = useState(seedPricing?.transportation?.note ?? "");

    // Metadata
    const [clientName, setClientName] = useState(initialQuotation?.clientName ?? "");
    const [clientPhone, setClientPhone] = useState(initialQuotation?.clientPhone ?? "");
    const [clientAddress, setClientAddress] = useState(initialQuotation?.clientAddress ?? "");
    const [deliveryAddress, setDeliveryAddress] = useState(initialQuotation?.deliveryAddress ?? "");
    const [customerRef, setCustomerRef] = useState(initialQuotation?.customerRef ?? "");

    const installation: CostInclusion = { included: installationIncluded, amount: installationAmount, note: installationNote };
    const transportation: CostInclusion = { included: transportationIncluded, amount: transportationAmount, note: transportationNote };

    /** Section breakdowns for worksheet-based sections — priced against the shared per-system rates above. */
    const buildWorksheetSectionBreakdowns = (): SectionPricing[] =>
        sectionResults.map((section) => {
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
                position: itemPositions[section.sectionId],
                details: mergeItemDetails(sectionTypeDetails[typeKey], itemDetailOverrides[section.sectionId]),
            };
        });

    /** Section breakdowns for manual sections — plain area × rate, no stock-optimization engine involved. */
    const buildManualSectionBreakdowns = (): SectionPricing[] =>
        manualSections.map((section) => {
            const areaSqFt = section.width && section.height && section.quantity
                ? (section.width * section.height * section.quantity) / AREA_SQMM_PER_SQFT
                : 0;

            const profiles: LineItem[] = section.frameRatePerSqft > 0 && areaSqFt > 0
                ? [{ name: "Frame & Fabrication", area: areaSqFt, unit: "sqft", rate: section.frameRatePerSqft, cost: areaSqFt * section.frameRatePerSqft }]
                : [];

            const glass: LineItem[] = areaSqFt > 0
                ? [{
                    name: section.glassType || "Glass",
                    area: areaSqFt,
                    unit: "sqft",
                    rate: section.glassRate,
                    cost: areaSqFt * section.glassRate,
                    widthMm: section.width ?? undefined,
                    heightMm: section.height ?? undefined,
                }]
                : [];

            const accessories: LineItem[] = (extraHardware[section.id] || [])
                .filter((item) => item.name.trim())
                .map((item) => ({ name: item.name, quantity: item.quantity, unit: item.unit, rate: item.rate, cost: item.quantity * item.rate }));

            const subtotal =
                profiles.reduce((s, p) => s + p.cost, 0) +
                glass.reduce((s, g) => s + g.cost, 0) +
                accessories.reduce((s, a) => s + a.cost, 0);

            return {
                sectionId: section.id,
                sectionName: section.name,
                configLabel: buildConfigLabel({
                    trackType: section.trackType,
                    configuration: section.configuration,
                    panels: 2,
                }),
                trackType: section.trackType,
                configuration: section.configuration,
                panels: 2,
                qty: section.quantity || 0,
                areaSqFt,
                widthMm: section.width || 0,
                heightMm: section.height || 0,
                profiles,
                glass,
                accessories,
                subtotal,
                position: section.position,
                details: section.details,
            };
        });

    const totals = useMemo(() => {
        const sectionBreakdowns: SectionPricing[] = worksheetId
            ? buildWorksheetSectionBreakdowns()
            : buildManualSectionBreakdowns();

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
            laborCost,
            ...computed,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        worksheetId,
        sectionResults,
        windowInput,
        sectionTypeRates,
        sectionTypeDetails,
        itemPositions,
        itemDetailOverrides,
        manualSections,
        extraHardware,
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

    const addManualSection = () => {
        setManualSections([...manualSections, createEmptyManualSection(rateCard)]);
    };

    const updateManualSection = (id: string, updates: Partial<ManualSection>) => {
        setManualSections(manualSections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    };

    const removeManualSection = (id: string) => {
        setManualSections(manualSections.filter((s) => s.id !== id));
        setExtraHardware((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
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

    const updateItemPosition = (sectionId: string, label: string) => {
        setItemPositions({ ...itemPositions, [sectionId]: { ...itemPositions[sectionId], label } });
    };

    const toggleDetailOverride = (sectionId: string) => {
        setExpandedDetailItems({ ...expandedDetailItems, [sectionId]: !expandedDetailItems[sectionId] });
    };

    const updateItemDetailOverride = (sectionId: string, updates: Partial<ItemSpecDetails>) => {
        setItemDetailOverrides({
            ...itemDetailOverrides,
            [sectionId]: { ...itemDetailOverrides[sectionId], ...updates },
        });
    };

    const updateSectionTypeDetails = (typeKey: string, updates: Partial<ItemSpecDetails>) => {
        setSectionTypeDetails({
            ...sectionTypeDetails,
            [typeKey]: { ...sectionTypeDetails[typeKey], ...updates },
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

    const handleSave = async (mode: "draft" | "final") => {
        setSaving(mode);
        try {
            const laborBreakdown = laborItemized
                ? { mode: "itemized" as const, items: laborItems.filter((item) => item.name.trim()) }
                : { mode: laborMode, percent: laborPercent, ratePerSqft: laborRatePerSqft };

            const pricingData = {
                sections: totals.sectionBreakdowns,
                profiles: [],
                glass: [],
                accessories: [],
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

            const input = {
                worksheetId,
                clientName,
                clientPhone,
                clientAddress,
                deliveryAddress: deliveryAddress || clientAddress,
                customerRef,
                pricingData,
                totalAmount: totals.finalTotal,
            };

            const res = quotationId
                ? await updateQuotation(quotationId, input)
                : await createQuotation(input);

            if (!res.success || !res.id) {
                toast("Failed to save: " + res.error, "error");
                return;
            }

            if (mode === "final") {
                toast(quotationId ? "Quotation updated." : "Quotation created.");
                router.push(`/quotations/${res.id}`);
                return;
            }

            toast("Saved as draft.");
            if (!quotationId) {
                // Transition a fresh create into edit mode for the row we just made,
                // so continued edits save-in-place instead of creating duplicates.
                setQuotationId(res.id);
                router.replace(`/quotations/create?editId=${res.id}`);
            } else {
                router.refresh();
            }
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="min-h-screen bg-surface-muted p-4 sm:p-6 lg:p-8 font-sans">
            <datalist id="hardware-rate-suggestions">
                {Object.keys(rateCard?.hardwareRates || {}).map((name) => (
                    <option key={name} value={name} />
                ))}
            </datalist>
            <div className="w-full space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-text">{isEditMode ? "Edit Quotation" : "Create Quotation"}</h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => handleSave("draft")} isLoading={saving === "draft"} disabled={saving !== null}>
                            <FileText className="w-4 h-4 mr-2" />
                            Save as Draft
                        </Button>
                        <Button onClick={() => handleSave("final")} isLoading={saving === "final"} disabled={saving !== null}>
                            <Save className="w-4 h-4 mr-2" />
                            {isEditMode ? "Save & View" : "Generate Quote"}
                        </Button>
                    </div>
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-3 space-y-6">
                        {/* Client Details */}
                        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-4">
                            <h2 className="font-semibold text-lg text-text border-b pb-2">Client Details</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                <div className="sm:col-span-2 lg:col-span-2">
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
                                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
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

                                            {/* Details shared by every section using this system —
                                                shown on the printed quote next to the schematic.
                                                Leave every field blank to keep printing exactly as
                                                it did before this feature existed. */}
                                            <div className="pt-2 border-t border-border">
                                                <Label className="text-[11px] mb-1 leading-tight text-text-muted">Details for this system (color, mesh, handle, locking, notes)</Label>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {([
                                                        ["profileColor", "Profile Color"],
                                                        ["glassSpec", "Glass Spec"],
                                                        ["meshGrade", "Bug Mesh"],
                                                        ["meshHandle", "Mesh Handle"],
                                                        ["locking", "Locking"],
                                                        ["handleColor", "Handle Color"],
                                                        ["hinge", "Hinge"],
                                                    ] as const).map(([field, fieldLabel]) => (
                                                        <div key={field}>
                                                            <Label className="text-[11px] mb-0.5 leading-tight">{fieldLabel}</Label>
                                                            <Input
                                                                className="h-8 text-xs"
                                                                value={sectionTypeDetails[typeRate.sectionTypeKey]?.[field] ?? ""}
                                                                onChange={(e) => updateSectionTypeDetails(typeRate.sectionTypeKey, { [field]: e.target.value })}
                                                            />
                                                        </div>
                                                    ))}
                                                    <div className="col-span-2 sm:col-span-4">
                                                        <Label className="text-[11px] mb-0.5 leading-tight">Notes</Label>
                                                        <Input
                                                            className="h-8 text-xs"
                                                            value={sectionTypeDetails[typeRate.sectionTypeKey]?.notes ?? ""}
                                                            onChange={(e) => updateSectionTypeDetails(typeRate.sectionTypeKey, { notes: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
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
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-semibold text-text">
                                                                {section.sectionName}{section.qty > 1 ? ` × ${section.qty}` : ""}
                                                            </div>
                                                            <Input
                                                                className="h-7 text-xs max-w-[220px]"
                                                                placeholder="Position, e.g. W01 GF Living Room"
                                                                value={itemPositions[section.sectionId]?.label ?? ""}
                                                                onChange={(e) => updateItemPosition(section.sectionId, e.target.value)}
                                                            />
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

                                                        {/* Per-item override — only needed when this one window
                                                            differs from its system's shared Details above. */}
                                                        <div className="mt-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleDetailOverride(section.sectionId)}
                                                                className="text-xs text-text-muted hover:text-text hover:underline"
                                                            >
                                                                {expandedDetailItems[section.sectionId] ? "Hide" : "Override"} details for this item
                                                            </button>
                                                            {expandedDetailItems[section.sectionId] && (
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-1">
                                                                    {([
                                                                        ["profileColor", "Profile Color"],
                                                                        ["glassSpec", "Glass Spec"],
                                                                        ["meshGrade", "Bug Mesh"],
                                                                        ["meshHandle", "Mesh Handle"],
                                                                        ["locking", "Locking"],
                                                                        ["handleColor", "Handle Color"],
                                                                        ["hinge", "Hinge"],
                                                                        ["notes", "Notes"],
                                                                    ] as const).map(([field, fieldLabel]) => (
                                                                        <Input
                                                                            key={field}
                                                                            className="h-7 text-xs"
                                                                            placeholder={fieldLabel}
                                                                            value={itemDetailOverrides[section.sectionId]?.[field] ?? ""}
                                                                            onChange={(e) => updateItemDetailOverride(section.sectionId, { [field]: e.target.value })}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}
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
                            /* Manual section builder — dimensions, track/config, glass rate, and
                               a live diagram per section, priced by area × rate. */
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold text-lg text-text">Window Sections</h2>
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
                                            {(["mm", "ft"] as const).map((u) => (
                                                <button
                                                    key={u}
                                                    type="button"
                                                    onClick={() => setManualUnitMode(u)}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${manualUnitMode === u ? "bg-text text-surface" : "text-text-muted hover:text-text"}`}
                                                >
                                                    {u}
                                                </button>
                                            ))}
                                        </div>
                                        <Button type="button" size="sm" variant="outline" onClick={addManualSection}>
                                            <Plus className="w-4 h-4 mr-1" /> Add Section
                                        </Button>
                                    </div>
                                </div>
                                {manualSections.map((section) => (
                                    <ManualSectionForm
                                        key={section.id}
                                        section={section}
                                        unitMode={manualUnitMode}
                                        glassRates={rateCard?.glassRates || {}}
                                        canRemove={manualSections.length > 1}
                                        onUpdate={(updates) => updateManualSection(section.id, updates)}
                                        onRemove={() => removeManualSection(section.id)}
                                        hardwareItems={(extraHardware[section.id] || []) as ManualHardwareItem[]}
                                        onAddHardware={() => addHardwareItem(section.id)}
                                        onUpdateHardware={(itemId, updates) => updateHardwareItem(section.id, itemId, updates)}
                                        onRemoveHardware={(itemId) => removeHardwareItem(section.id, itemId)}
                                    />
                                ))}
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
                        <div className="bg-surface-inverse text-text-inverse p-6 rounded-xl shadow-lg sticky top-20 space-y-6">
                            <h2 className="text-xl font-bold text-text-inverse border-b border-white/20 pb-2">Estimated Total</h2>
                            <p className="text-xs text-text-inverse/50 -mt-4">Internal figures — this breakdown is never shown to the customer.</p>

                            <div className="space-y-4 text-sm">
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
