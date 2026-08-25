"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { createInvoice, updateInvoice, type InvoiceLineInput, type InvoiceInput } from "./actions";
export type { InvoiceLineInput };
import { createCustomer, type CustomerInput } from "@/app/customers/actions";
import { isValidGstFormat } from "@/utils/validation";
import type { TaxType } from "@/utils/quotationPricing";

interface Customer {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    gstNumber: string | null;
}

export interface InvoiceFormInitial {
    quotationId: string | null;
    customerId: string | null;
    buyerName: string;
    buyerAddress: string;
    buyerGstNumber: string;
    buyerPhone: string;
    gstRate: number | null;
    taxType: TaxType;
    invoicePrefix: string;
    lines: InvoiceLineInput[];
}

interface InvoiceFormProps {
    invoiceId?: string;
    initial: InvoiceFormInitial;
    customers: Customer[];
    hsnCodes: Record<string, string>;
}

let lineKeySeq = 0;
function nextLineKey() {
    lineKeySeq += 1;
    return `line-${lineKeySeq}`;
}

interface LineDraft extends InvoiceLineInput {
    key: string;
}

export default function InvoiceForm({ invoiceId, initial, customers: initialCustomers, hsnCodes }: InvoiceFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const isEditMode = !!invoiceId;

    const [customers, setCustomers] = useState(initialCustomers);
    const [customerId, setCustomerId] = useState<string | null>(initial.customerId);
    const [buyerName, setBuyerName] = useState(initial.buyerName);
    const [buyerAddress, setBuyerAddress] = useState(initial.buyerAddress);
    const [buyerGstNumber, setBuyerGstNumber] = useState(initial.buyerGstNumber);
    const [buyerPhone, setBuyerPhone] = useState(initial.buyerPhone);
    const [gstRate, setGstRate] = useState<string>(initial.gstRate != null ? String(initial.gstRate) : "");
    const [taxType, setTaxType] = useState<TaxType>(initial.taxType);
    const [invoicePrefix, setInvoicePrefix] = useState(initial.invoicePrefix);
    const [perLineGst, setPerLineGst] = useState(initial.lines.some((l) => l.gstRate != null));
    const [lines, setLines] = useState<LineDraft[]>(
        initial.lines.length > 0
            ? initial.lines.map((l) => ({ ...l, key: nextLineKey() }))
            : [{ key: nextLineKey(), description: "", taxableAmount: 0, hsnCode: "", gstRate: undefined }]
    );
    const [saving, setSaving] = useState(false);
    const [savingCustomer, setSavingCustomer] = useState(false);

    const buyerGstWarning = buyerGstNumber.trim() && !isValidGstFormat(buyerGstNumber) ? "Doesn't look like a valid GSTIN — you can still save." : null;

    const handleSelectCustomer = (id: string) => {
        if (id === "__new__") {
            setCustomerId(null);
            return;
        }
        const customer = customers.find((c) => c.id === id);
        if (!customer) return;
        setCustomerId(customer.id);
        setBuyerName(customer.name);
        setBuyerPhone(customer.phone ?? "");
        setBuyerAddress(customer.address ?? "");
        setBuyerGstNumber(customer.gstNumber ?? "");
    };

    const handleSaveAsCustomer = async () => {
        if (!buyerName.trim()) return;
        setSavingCustomer(true);
        try {
            const input: CustomerInput = { name: buyerName, phone: buyerPhone || undefined, address: buyerAddress || undefined, gstNumber: buyerGstNumber || undefined };
            const res = await createCustomer(input);
            if (res.success && res.data) {
                setCustomers((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
                setCustomerId(res.data.id);
                toast("Saved as a reusable customer.");
            } else {
                toast(res.error || "Failed to save customer", "error");
            }
        } finally {
            setSavingCustomer(false);
        }
    };

    const updateLine = (key: string, patch: Partial<LineDraft>) => {
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    };

    /** Qty × Rate recomputes Taxable Amount automatically — but only when the
     * user edits qty/rate, never when they edit Taxable Amount directly, so a
     * manual override always wins until qty/rate changes again. */
    const updateLineQtyOrRate = (key: string, patch: Partial<Pick<LineDraft, "quantity" | "unit" | "ratePerUnit">>) => {
        setLines((prev) =>
            prev.map((l) => {
                if (l.key !== key) return l;
                const next = { ...l, ...patch };
                const taxableAmount = next.quantity != null && next.ratePerUnit != null ? Math.round(next.quantity * next.ratePerUnit * 100) / 100 : next.taxableAmount;
                return { ...next, taxableAmount };
            })
        );
    };

    const addLine = () => setLines((prev) => [...prev, { key: nextLineKey(), description: "", taxableAmount: 0, hsnCode: "", gstRate: undefined }]);
    const removeLine = (key: string) => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

    const totalTaxable = lines.reduce((sum, l) => sum + (Number(l.taxableAmount) || 0), 0);

    const handleSave = async () => {
        if (!buyerName.trim()) {
            toast("Buyer name is required", "error");
            return;
        }
        const validLines = lines.filter((l) => l.description.trim());
        if (validLines.length === 0) {
            toast("Add at least one line item", "error");
            return;
        }

        setSaving(true);
        try {
            const input: InvoiceInput = {
                quotationId: initial.quotationId,
                customerId,
                buyerName,
                buyerAddress,
                buyerGstNumber,
                buyerPhone,
                gstRate: gstRate === "" ? undefined : Number(gstRate),
                taxType,
                invoicePrefix,
                lines: validLines.map((l) => ({
                    description: l.description,
                    taxableAmount: Number(l.taxableAmount) || 0,
                    hsnCode: l.hsnCode || undefined,
                    gstRate: perLineGst && l.gstRate !== undefined && l.gstRate !== null ? Number(l.gstRate) : undefined,
                })),
            };

            const res = isEditMode ? await updateInvoice(invoiceId!, input) : await createInvoice(input);
            if (!res.success || !res.id) {
                toast(res.error || "Failed to save invoice", "error");
                return;
            }

            toast(isEditMode ? "Invoice updated." : "Invoice created as a draft.");
            router.push(`/invoices/${res.id}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface-muted p-4 sm:p-6 lg:p-8">
            <datalist id="hsn-code-suggestions">
                {Object.entries(hsnCodes).map(([category, code]) => (
                    <option key={category} value={code}>{category}</option>
                ))}
            </datalist>
            <div className="w-full max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Link href={isEditMode ? `/invoices/${invoiceId}` : "/invoices"}>
                        <Button variant="ghost">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-text">{isEditMode ? "Edit Invoice" : "New Invoice"}</h1>
                    <div className="w-24" />
                </div>

                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-4">
                    <h2 className="font-semibold text-lg text-text border-b pb-2">Buyer Details</h2>
                    {customers.length > 0 && (
                        <div>
                            <Label>Saved Customer</Label>
                            <Select value={customerId ?? "__new__"} onValueChange={handleSelectCustomer}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Type a new client, or pick a saved one" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__new__">Type a new client…</SelectItem>
                                    {customers.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label>Buyer Name</Label>
                            <Input value={buyerName} onChange={(e) => { setBuyerName(e.target.value); setCustomerId(null); }} placeholder="Type name..." />
                        </div>
                        <div>
                            <Label>Phone</Label>
                            <Input value={buyerPhone} onChange={(e) => { setBuyerPhone(e.target.value); setCustomerId(null); }} placeholder="Optional" />
                        </div>
                        <div>
                            <Label>GST Number</Label>
                            <Input value={buyerGstNumber} onChange={(e) => { setBuyerGstNumber(e.target.value); setCustomerId(null); }} placeholder="Optional" />
                            {buyerGstWarning && <p className="text-xs text-warning mt-1">{buyerGstWarning}</p>}
                        </div>
                        <div>
                            <Label>Address</Label>
                            <Input value={buyerAddress} onChange={(e) => { setBuyerAddress(e.target.value); setCustomerId(null); }} placeholder="Optional" />
                        </div>
                    </div>
                    {!customerId && buyerName.trim() && (
                        <div className="flex justify-end">
                            <Button type="button" variant="ghost" size="sm" onClick={handleSaveAsCustomer} isLoading={savingCustomer}>
                                Save as reusable customer
                            </Button>
                        </div>
                    )}
                </div>

                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h2 className="font-semibold text-lg text-text">Line Items</h2>
                        <label className="flex items-center gap-2 text-xs text-text-muted">
                            <input type="checkbox" checked={perLineGst} onChange={(e) => setPerLineGst(e.target.checked)} />
                            Different GST rate per line
                        </label>
                    </div>

                    <div className="space-y-4">
                        {lines.map((line) => (
                            <div key={line.key} className="border-b border-border-muted pb-4 last:border-b-0 space-y-2">
                                <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                        <Label className="text-xs">Description</Label>
                                        <Input value={line.description} onChange={(e) => updateLine(line.key, { description: e.target.value })} placeholder="e.g. Aluminium Sliding Window Section" />
                                    </div>
                                    <div className="w-32">
                                        <Label className="text-xs">HSN Code</Label>
                                        <Input list="hsn-code-suggestions" value={line.hsnCode ?? ""} onChange={(e) => updateLine(line.key, { hsnCode: e.target.value })} placeholder="Optional" />
                                    </div>
                                    <button type="button" onClick={() => removeLine(line.key)} className="text-text-muted hover:text-danger mt-6" title="Remove line">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    <div>
                                        <Label className="text-xs">Qty.</Label>
                                        <Input type="number" step="0.01" value={line.quantity ?? ""} onChange={(e) => updateLineQtyOrRate(line.key, { quantity: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="Optional" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Unit</Label>
                                        <Input value={line.unit ?? ""} onChange={(e) => updateLine(line.key, { unit: e.target.value })} placeholder="e.g. Sq Ft" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Rate / Unit</Label>
                                        <Input type="number" step="0.01" value={line.ratePerUnit ?? ""} onChange={(e) => updateLineQtyOrRate(line.key, { ratePerUnit: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="Optional" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Taxable Amount</Label>
                                        <Input type="number" step="0.01" value={line.taxableAmount} onChange={(e) => updateLine(line.key, { taxableAmount: Number(e.target.value) || 0 })} />
                                    </div>
                                    {perLineGst && (
                                        <div>
                                            <Label className="text-xs">GST % (override)</Label>
                                            <Input type="number" step="0.01" value={line.gstRate ?? ""} onChange={(e) => updateLine(line.key, { gstRate: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder={gstRate || "0"} />
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-text-muted">Qty × Rate fills in Taxable Amount automatically — edit Taxable Amount directly any time to override.</p>
                            </div>
                        ))}
                    </div>

                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                        <Plus className="w-4 h-4 mr-1" /> Add Line
                    </Button>

                    <div className="flex justify-end pt-2 border-t border-border text-sm">
                        <span className="text-text-muted mr-2">Total Taxable Amount:</span>
                        <span className="font-semibold text-text">₹{totalTaxable.toFixed(2)}</span>
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-4">
                    <h2 className="font-semibold text-lg text-text border-b pb-2">GST & Numbering</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {!perLineGst && (
                            <div>
                                <Label>GST Rate (%)</Label>
                                <Input type="number" step="0.01" value={gstRate} onChange={(e) => setGstRate(e.target.value)} placeholder="e.g. 18" />
                            </div>
                        )}
                        <div>
                            <Label>Tax Type</Label>
                            <Select value={taxType} onValueChange={(v) => setTaxType(v as TaxType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CGST_SGST">CGST + SGST (same state)</SelectItem>
                                    <SelectItem value="IGST">IGST (different state)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Invoice Prefix</Label>
                            <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} placeholder="INV" />
                            <p className="text-xs text-text-muted mt-1">Helps tell this series apart if you also invoice elsewhere.</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleSave} isLoading={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {isEditMode ? "Save Changes" : "Save Draft & Continue"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
