"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ArrowLeft, Save, Calculator } from "lucide-react";
import Link from "next/link";
import { createQuotation } from "../actions";

// Types for pricing state
interface RateMap {
    [key: string]: number; // Item Name -> Rate
}

export default function QuotationBuilder() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const worksheetId = searchParams.get("worksheetId");

    const [loading, setLoading] = useState(true);
    const [worksheet, setWorksheet] = useState<any>(null);
    const [sectionResults, setSectionResults] = useState<any[]>([]);

    // Pricing State
    const [profileRates, setProfileRates] = useState<RateMap>({}); // Rate per Kg/Ft/Meter - let's stick to Kg for weight? Or Ft? User didn't specify unit preference for rates. Let's assume Ft or Kg. Let's use Ft for simpler estimation if weight not available. But profiles are sold by Kg. 
    // Wait, the calculation result gives length. Converting length to weight requires density/profile weight per meter. We don't have that data in DB yet.
    // Let's stick to "Rate per Length (ft/mm)" or "Total Cost" input for simplicity for now, OR asking user for Rate per Foot.
    // Let's use Rate per Foot as default since we have total lengths.

    const [glassRates, setGlassRates] = useState<RateMap>({}); // Rate per Sq.Ft
    const [accessoryRates, setAccessoryRates] = useState<RateMap>({}); // Rate per unit/ft

    // Overheads
    const [laborCost, setLaborCost] = useState<number>(0);
    const [overheadCost, setOverheadCost] = useState<number>(0);
    const [profitMargin, setProfitMargin] = useState<number>(15); // %
    const [taxRate, setTaxRate] = useState<number>(18); // % GST

    // Metadata
    const [clientName, setClientName] = useState("");
    const [quotationNumber, setQuotationNumber] = useState(`Q-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`);

    useEffect(() => {
        if (!worksheetId) return;

        fetch(`/api/worksheets/${worksheetId}`)
            .then(res => res.json())
            .then(data => {
                setWorksheet(data);
                if (data.data?.result?.sectionResults) {
                    setSectionResults(data.data.result.sectionResults);
                    initializeRates(data.data.result.sectionResults);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [worksheetId]);

    const initializeRates = (results: any[]) => {
        // Pre-fill keys
        const pRates: RateMap = {};
        const gRates: RateMap = {};
        const aRates: RateMap = {};

        results.forEach(section => {
            section.materials.forEach((mat: any) => {
                const name = mat.stockBreakdown.stockName;
                if (!pRates[name]) pRates[name] = 0;
            });
            // Glass logic (simplified aggregation)
            // ... actually glass info is inside section.glassInfo
            section.glassInfo.forEach((g: any) => {
                // We need a glass TYPE. But current calculation just assumes "Glass".
                // Let's assume generic "Glass" rate for now or if we had type.
                // The system currently supports "Glass" or "Mosquito".
                // Mosquito is an accessory/panel type, but handled in glass info? 
                // Wait, glassInfo contains actual Glass dimensions.
                // Mosquito mesh is separate in accessories?
                if (!gRates["Clear Glass"]) gRates["Clear Glass"] = 0;
            });

            // Accessories
            if (section.accessories.mosquitoCChannel > 0) aRates["Mosquito Mesh"] = 0;
            if (section.accessories.trackCap > 0) aRates["Track Cap"] = 0;
        });

        setProfileRates(prev => ({ ...pRates, ...prev }));
        setGlassRates(prev => ({ ...gRates, ...prev }));
        setAccessoryRates(prev => ({ ...aRates, ...prev }));
    };

    // Aggregations
    const totals = useMemo(() => {
        let totalProfileLengthFt = 0;
        let totalProfileCost = 0;

        let totalGlassAreaSqFt = 0;
        let totalGlassCost = 0;

        let totalAccessoryCost = 0;

        // Iterate sections to sum up quantities and apply rates
        // Ideally we aggregated this in Orderbook logic too.

        // 1. Profiles
        const profileQuantities: { [key: string]: number } = {}; // Name -> Total Ft

        sectionResults.forEach(section => {
            section.materials.forEach((mat: any) => {
                const name = mat.stockBreakdown.stockName;
                const ft = (mat.stockBreakdown.stocksNeeded * mat.stockBreakdown.stockLength) / 304.8; // Approx Ft
                // Better: (stocksNeeded * stockLength) is total mm. / 304.8 = ft.
                profileQuantities[name] = (profileQuantities[name] || 0) + ft;
            });
        });

        Object.entries(profileQuantities).forEach(([name, qty]) => {
            const rate = profileRates[name] || 0;
            totalProfileCost += qty * rate;
            totalProfileLengthFt += qty;
        });

        // 2. Glass
        // Sum total area
        sectionResults.forEach(section => {
            section.glassInfo.forEach((g: any) => {
                totalGlassAreaSqFt += g.glassSize.totalArea / 92903;
            });
        });
        totalGlassCost = totalGlassAreaSqFt * (glassRates["Clear Glass"] || 0);

        // 3. Accessories
        let meshFt = 0;
        let trackCapFt = 0;
        sectionResults.forEach(section => {
            meshFt += section.accessories.mosquitoCChannel / 304.8;
            trackCapFt += section.accessories.trackCap / 304.8;
        });

        totalAccessoryCost += (meshFt * (accessoryRates["Mosquito Mesh"] || 0));
        totalAccessoryCost += (trackCapFt * (accessoryRates["Track Cap"] || 0));


        const subTotal = totalProfileCost + totalGlassCost + totalAccessoryCost + Number(laborCost) + Number(overheadCost);
        const profitAmount = subTotal * (profitMargin / 100);
        const taxableAmount = subTotal + profitAmount;
        const taxAmount = taxableAmount * (taxRate / 100);
        const finalTotal = taxableAmount + taxAmount;

        return {
            profileQuantities,
            totalProfileLengthFt,
            totalProfileCost,
            totalGlassAreaSqFt,
            totalGlassCost,
            totalAccessoryCost,
            subTotal,
            profitAmount,
            taxAmount,
            finalTotal
        };

    }, [sectionResults, profileRates, glassRates, accessoryRates, laborCost, overheadCost, profitMargin, taxRate]);

    const handleSave = async () => {
        if (!worksheetId) return;

        const pricingData = {
            profiles: Object.entries(totals.profileQuantities).map(([name, qty]) => ({
                name,
                quantity: qty,
                unit: "ft",
                rate: profileRates[name] || 0,
                cost: qty * (profileRates[name] || 0)
            })),
            glass: [
                { name: "Clear Glass", area: totals.totalGlassAreaSqFt, unit: "sqft", rate: glassRates["Clear Glass"] || 0, cost: totals.totalGlassCost }
            ],
            accessories: [
                { name: "Mosquito Mesh", quantity: 0, unit: "ft", rate: accessoryRates["Mosquito Mesh"] || 0, cost: 0 }, // Simplified for now
                { name: "Track Cap", quantity: 0, unit: "ft", rate: accessoryRates["Track Cap"] || 0, cost: 0 }
            ],
            labor: laborCost,
            overhead: overheadCost,
            profitMargin,
            taxRate
        };

        const res = await createQuotation({
            worksheetId,
            clientName,
            quotationNumber,
            pricingData,
            totalAmount: totals.finalTotal
        });

        if (res.success) {
            router.push(`/quotations/${res.id}`); // View page
        } else {
            alert("Failed to save: " + res.error);
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
                    <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                        <Save className="w-4 h-4 mr-2" />
                        Generate Quote
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Inputs */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Client Details */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h2 className="font-semibold text-lg text-slate-800 border-b pb-2">Client Details</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Client Name</Label>
                                    <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Type name..." />
                                </div>
                                <div>
                                    <Label>Quote No.</Label>
                                    <Input value={quotationNumber} onChange={e => setQuotationNumber(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Profile Rates */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h2 className="font-semibold text-lg text-slate-800 border-b pb-2">Aluminium Rates (per Ft)</h2>
                            <div className="space-y-3">
                                {Object.keys(profileRates).map(name => (
                                    <div key={name} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 truncate mr-4">{name} ({totals.profileQuantities[name]?.toFixed(1)} ft)</span>
                                        <Input
                                            type="number"
                                            className="w-24 text-right"
                                            placeholder="Rate"
                                            value={profileRates[name] || ""}
                                            onChange={e => setProfileRates({ ...profileRates, [name]: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Glass Rates */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h2 className="font-semibold text-lg text-slate-800 border-b pb-2">Glass Rates (per Sq.Ft)</h2>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Clear Glass ({totals.totalGlassAreaSqFt.toFixed(1)} sq.ft)</span>
                                <Input
                                    type="number"
                                    className="w-24 text-right"
                                    value={glassRates["Clear Glass"] || ""}
                                    onChange={e => setGlassRates({ ...glassRates, "Clear Glass": parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        {/* Overheads */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h2 className="font-semibold text-lg text-slate-800 border-b pb-2">Costs & Margins</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Labor Cost</Label>
                                    <Input type="number" value={laborCost} onChange={e => setLaborCost(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div>
                                    <Label>Overhead/Misc</Label>
                                    <Input type="number" value={overheadCost} onChange={e => setOverheadCost(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div>
                                    <Label>Profit Margin (%)</Label>
                                    <Input type="number" value={profitMargin} onChange={e => setProfitMargin(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div>
                                    <Label>Tax / GST (%)</Label>
                                    <Input type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Live Preview */}
                    <div className="md:col-span-1">
                        <div className="bg-slate-900 text-slate-100 p-6 rounded-xl shadow-lg sticky top-6 space-y-6">
                            <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2">Estimated Totaal</h2>

                            <div className="space-y-4 text-sm">
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
                                <div className="text-3xl font-bold text-white">
                                    {formatCurrency(totals.finalTotal)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

