"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { Pencil } from "lucide-react";
import { updateQuotationClientDetails } from "../actions";
import { isValidGstFormat } from "@/utils/validation";

interface Customer {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    gstNumber: string | null;
}

interface EditClientDetailsButtonProps {
    quotationId: string;
    customers: Customer[];
    initial: {
        customerId: string | null;
        clientName: string | null;
        clientPhone: string | null;
        clientAddress: string | null;
        clientGstNumber: string | null;
        deliveryAddress: string | null;
        customerRef: string | null;
    };
}

/**
 * Client-detail fields (name/phone/address/GST/customer link) stay editable
 * regardless of whether the quotation is locked — the lock protects pricing
 * integrity, not this data. This is intentionally a separate, lightweight
 * form from the full QuotationBuilder wizard, which stays blocked once
 * locked.
 */
export default function EditClientDetailsButton({ quotationId, customers, initial }: EditClientDetailsButtonProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [customerId, setCustomerId] = useState<string | null>(initial.customerId);
    const [clientName, setClientName] = useState(initial.clientName ?? "");
    const [clientPhone, setClientPhone] = useState(initial.clientPhone ?? "");
    const [clientAddress, setClientAddress] = useState(initial.clientAddress ?? "");
    const [clientGstNumber, setClientGstNumber] = useState(initial.clientGstNumber ?? "");
    const [deliveryAddress, setDeliveryAddress] = useState(initial.deliveryAddress ?? "");
    const [customerRef, setCustomerRef] = useState(initial.customerRef ?? "");

    const gstWarning = clientGstNumber.trim() && !isValidGstFormat(clientGstNumber) ? "Doesn't look like a valid GSTIN — you can still save." : null;

    const handleSelectCustomer = (id: string) => {
        if (id === "__new__") {
            setCustomerId(null);
            return;
        }
        const customer = customers.find((c) => c.id === id);
        if (!customer) return;
        setCustomerId(customer.id);
        setClientName(customer.name);
        setClientPhone(customer.phone ?? "");
        setClientAddress(customer.address ?? "");
        setClientGstNumber(customer.gstNumber ?? "");
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await updateQuotationClientDetails(quotationId, {
                customerId,
                clientName,
                clientPhone,
                clientAddress,
                clientGstNumber,
                deliveryAddress,
                customerRef,
            });
            if (!res.success) {
                toast(res.error || "Failed to update client details", "error");
                return;
            }
            toast("Client details updated.");
            setOpen(false);
            router.refresh();
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="print:hidden">
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit client details
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Client Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
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
                                <Label>Client Name</Label>
                                <Input value={clientName} onChange={(e) => { setClientName(e.target.value); setCustomerId(null); }} />
                            </div>
                            <div>
                                <Label>Customer Ref</Label>
                                <Input value={customerRef} onChange={(e) => setCustomerRef(e.target.value)} />
                            </div>
                            <div>
                                <Label>Phone</Label>
                                <Input value={clientPhone} onChange={(e) => { setClientPhone(e.target.value); setCustomerId(null); }} />
                            </div>
                            <div>
                                <Label>GST Number</Label>
                                <Input value={clientGstNumber} onChange={(e) => { setClientGstNumber(e.target.value); setCustomerId(null); }} />
                                {gstWarning && <p className="text-xs text-warning mt-1">{gstWarning}</p>}
                            </div>
                            <div className="sm:col-span-2">
                                <Label>Bill To Address</Label>
                                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
                            </div>
                            <div className="sm:col-span-2">
                                <Label>Deliver To Address</Label>
                                <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Same as Bill To if left blank" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} isLoading={saving} disabled={!clientName.trim()}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
