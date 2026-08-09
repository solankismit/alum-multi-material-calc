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

interface RateMap {
    [key: string]: number;
}

interface RateCardData {
    profileRatePerFt: number;
    glassRates: RateMap;
    hardwareRates: RateMap;
    laborDefault: number;
    overheadDefault: number;
    profitMarginDefault: number;
    taxRateDefault: number;
}

interface FreeformItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    rate: number;
}

interface SectionResult {
    materials: Array<{ stockBreakdown: { stockName: string; stockLength: number; stocksNeeded: number } }>;
    glassInfo: Array<{ glassSize: { totalArea: number } }>;
    accessories: { mosquitoCChannel: number; trackCap: number };
}

export default function QuotationBuilder() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const worksheetId = searchParams.get("worksheetId");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sectionResults, setSectionResults] = useState<SectionResult[]>([]);
    const [rateCard, setRateCard] = useState<RateCardData | null>(null);

    // Pricing state — seeded from the rate card once it loads.
    const [profileRates, setProfileRates] = useState<RateMap>({});
    const [glassType, setGlassType] = useState<string>("");
    const [glassRate, setGlassRate] = useState<number>(0);
    const [meshRate, setMeshRate] = useState<number>(0);
    const [trackCapRate, setTrackCapRate] = useState<number>(0);

    // Direct-entry (no worksheet) line items
    const [freeformItems, setFreeformItems] = useState<FreeformItem[]>([
        { id: crypto.randomUUID(), name: "", quantity: 1, unit: "nos", rate: 0 },
    ]);

    // Overheads — seeded from rate card defaults
    const [laborCost, setLaborCost] = useState<number>(0);
    const [overheadCost, setOverheadCost] = useState<number>(0);
    const [profitMargin, setProfitMargin] = useState<number>(0);
    const [taxRate, setTaxRate] = useState<number>(0);

    // Metadata
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientAddress, setClientAddress] = useState("");
    const [quotationNumber, setQuotationNumber] = useState(`Q-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`);

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
                setLaborCost(card.laborDefault);
                setOverheadCost(card.overheadDefault);
                setProfitMargin(card.profitMarginDefault);
                setTaxRate(card.taxRateDefault);
                const firstGlassType = Object.keys(card.glassRates)[0];
                if (firstGlassType) {
                    setGlassType(firstGlassType);
                    setGlassRate(card.glassRates[firstGlassType]);
                }
                setMeshRate(card.hardwareRates["Mosquito Mesh"] ?? card.hardwareRates["C-Channel"] ?? 0);
                setTrackCapRate(card.hardwareRates["Track Cap"] ?? 0);
            }

            const results: SectionResult[] = worksheet?.data?.result?.sectionResults;
            if (results) {
                setSectionResults(results);
                const pRates: RateMap = {};
                results.forEach((section) => {
                    section.materials.forEach((mat) => {
                        pRates[mat.stockBreakdown.stockName] = card?.profileRatePerFt ?? 0;
                    });
                });
                setProfileRates(pRates);
            }
            setLoading(false);
        });
    }, [worksheetId]);

    const totals = useMemo(() => {
        if (worksheetId) {
            const profileQuantities: RateMap = {};
            sectionResults.forEach((section) => {
                section.materials.forEach((mat) => {
                    const name = mat.stockBreakdown.stockName;
                    const ft = (mat.stockBreakdown.stocksNeeded * mat.stockBreakdown.stockLength) / 304.8;
                    profileQuantities[name] = (profileQuantities[name] || 0) + ft;
                });
            });

            let totalProfileCost = 0;
            Object.entries(profileQuantities).forEach(([name, qty]) => {
                totalProfileCost += qty * (profileRates[name] || 0);
            });

            let totalGlassAreaSqFt = 0;
            sectionResults.forEach((section) => {
                section.glassInfo.forEach((g) => {
                    totalGlassAreaSqFt += g.glassSize.totalArea / 92903;
                });
            });
            const totalGlassCost = totalGlassAreaSqFt * glassRate;

            let meshCount = 0;
            let trackCapCount = 0;
            sectionResults.forEach((section) => {
                meshCount += section.accessories.mosquitoCChannel;
                trackCapCount += section.accessories.trackCap;
            });
            const totalAccessoryCost = meshCount * meshRate + trackCapCount * trackCapRate;

            const subTotal = totalProfileCost + totalGlassCost + totalAccessoryCost + Number(laborCost) + Number(overheadCost);
            const profitAmount = subTotal * (profitMargin / 100);
            const taxableAmount = subTotal + profitAmount;
            const taxAmount = taxableAmount * (taxRate / 100);

            return {
                profileQuantities,
                totalProfileCost,
                totalGlassAreaSqFt,
                totalGlassCost,
                meshCount,
                trackCapCount,
                totalAccessoryCost,
                subTotal,
                profitAmount,
                taxAmount,
                finalTotal: taxableAmount + taxAmount,
            };
        }

        // Direct-entry mode
        const itemsCost = freeformItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
        const subTotal = itemsCost + Number(laborCost) + Number(overheadCost);
        const profitAmount = subTotal * (profitMargin / 100);
        const taxableAmount = subTotal + profitAmount;
        const taxAmount = taxableAmount * (taxRate / 100);

        return {
            profileQuantities: {} as RateMap,
            totalProfileCost: 0,
            totalGlassAreaSqFt: 0,
            totalGlassCost: 0,
            meshCount: 0,
            trackCapCount: 0,
            totalAccessoryCost: 0,
            itemsCost,
            subTotal,
            profitAmount,
            taxAmount,
            finalTotal: taxableAmount + taxAmount,
        };
    }, [worksheetId, sectionResults, profileRates, glassRate, meshRate, trackCapRate, freeformItems, laborCost, overheadCost, profitMargin, taxRate]);

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
                    profiles: Object.entries(totals.profileQuantities).map(([name, qty]) => ({
                        name,
                        quantity: qty,
                        unit: "ft",
                        rate: profileRates[name] || 0,
                        cost: qty * (profileRates[name] || 0),
                    })),
                    glass: totals.totalGlassAreaSqFt > 0
                        ? [{ name: glassType || "Glass", area: totals.totalGlassAreaSqFt, unit: "sqft", rate: glassRate, cost: totals.totalGlassCost }]
                        : [],
                    accessories: [
                        ...(totals.meshCount > 0 ? [{ name: "Mosquito Mesh / C-Channel", quantity: totals.meshCount, unit: "nos", rate: meshRate, cost: totals.meshCount * meshRate }] : []),
                        ...(totals.trackCapCount > 0 ? [{ name: "Track Cap", quantity: totals.trackCapCount, unit: "nos", rate: trackCapRate, cost: totals.trackCapCount * trackCapRate }] : []),
                    ],
                    labor: laborCost,
                    overhead: overheadCost,
                    profitMargin,
                    taxRate,
                }
                : {
                    profiles: [],
                    glass: [],
                    accessories: freeformItems
                        .filter((item) => item.name.trim())
                        .map((item) => ({ name: item.name, quantity: item.quantity, unit: item.unit, rate: item.rate, cost: item.quantity * item.rate })),
                    labor: laborCost,
                    overhead: overheadCost,
                    profitMargin,
                    taxRate,
                };

            const res = await createQuotation({
                worksheetId,
                clientName,
                clientPhone,
                clientAddress,
                quotationNumber,
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
                                    <Label>Quote No.</Label>
                                    <Input value={quotationNumber} onChange={(e) => setQuotationNumber(e.target.value)} />
                                </div>
                                <div>
                                    <Label>Phone</Label>
                                    <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Optional" />
                                </div>
                                <div>
                                    <Label>Site Address</Label>
                                    <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Optional" />
                                </div>
                            </div>
                        </div>

                        {worksheetId ? (
                            <>
                                {/* Profile Rates */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <h2 className="font-semibold text-lg text-slate-800 border-b pb-2">Aluminium Rates (per Ft)</h2>
                                    <div className="space-y-3">
                                        {Object.keys(profileRates).map((name) => (
                                            <div key={name} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600 truncate mr-4">
                                                    {name} ({totals.profileQuantities[name]?.toFixed(1)} ft)
                                                </span>
                                                <Input
                                                    type="number"
                                                    className="w-24 text-right"
                                                    placeholder="Rate"
                                                    value={profileRates[name] || ""}
                                                    onChange={(e) => setProfileRates({ ...profileRates, [name]: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Glass Rate */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <h2 className="font-semibold text-lg text-slate-800 border-b pb-2">Glass Rate (per Sq.Ft)</h2>
                                    <div className="flex items-center gap-3">
                                        {rateCard && Object.keys(rateCard.glassRates).length > 0 ? (
                                            <select
                                                className="flex-1 h-10 rounded-md border border-slate-200 px-3 text-sm"
                                                value={glassType}
                                                onChange={(e) => {
                                                    setGlassType(e.target.value);
                                                    setGlassRate(rateCard.glassRates[e.target.value] || 0);
                                                }}
                                            >
                                                {Object.keys(rateCard.glassRates).map((name) => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <Input value={glassType} onChange={(e) => setGlassType(e.target.value)} placeholder="Glass type" className="flex-1" />
                                        )}
                                        <span className="text-sm text-slate-500 whitespace-nowrap">{totals.totalGlassAreaSqFt.toFixed(1)} sq.ft</span>
                                        <Input
                                            type="number"
                                            className="w-24 text-right"
                                            value={glassRate || ""}
                                            onChange={(e) => setGlassRate(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>

                                {/* Hardware Rates */}
                                {(totals.meshCount > 0 || totals.trackCapCount > 0) && (
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                        <h2 className="font-semibold text-lg text-slate-800 border-b pb-2">Hardware / Accessories</h2>
                                        <div className="space-y-3">
                                            {totals.meshCount > 0 && (
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-600">Mosquito Mesh / C-Channel ({totals.meshCount} nos)</span>
                                                    <Input type="number" className="w-24 text-right" value={meshRate || ""} onChange={(e) => setMeshRate(parseFloat(e.target.value) || 0)} />
                                                </div>
                                            )}
                                            {totals.trackCapCount > 0 && (
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-600">Track Cap ({totals.trackCapCount} nos)</span>
                                                    <Input type="number" className="w-24 text-right" value={trackCapRate || ""} onChange={(e) => setTrackCapRate(parseFloat(e.target.value) || 0)} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Labor Cost</Label>
                                    <Input type="number" value={laborCost} onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div>
                                    <Label>Overhead/Misc</Label>
                                    <Input type="number" value={overheadCost} onChange={(e) => setOverheadCost(parseFloat(e.target.value) || 0)} />
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
                                    <span>{formatCurrency(Number(laborCost) + Number(overheadCost))}</span>
                                </div>
                                <div className="border-t border-slate-700 pt-2 flex justify-between font-semibold">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(totals.subTotal)}</span>
                                </div>
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
