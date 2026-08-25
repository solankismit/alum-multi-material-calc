"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { isValidGstFormat } from "@/utils/validation";
import { Loader2, X } from "lucide-react";

interface ProfileFormProps {
    initialName: string;
    initialCompany: string;
    initialBusinessAddress?: string;
    initialBusinessPhone?: string;
    initialGstNumber?: string;
    initialLogoUrl?: string | null;
    initialBankAccountName?: string;
    initialBankAccountNumber?: string;
    initialBankIfsc?: string;
    initialBankName?: string;
    email: string;
}

export function ProfileForm({
    initialName,
    initialCompany,
    initialBusinessAddress,
    initialBusinessPhone,
    initialGstNumber,
    initialLogoUrl,
    initialBankAccountName,
    initialBankAccountNumber,
    initialBankIfsc,
    initialBankName,
    email,
}: ProfileFormProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [gstNumber, setGstNumber] = useState(initialGstNumber ?? "");
    const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoError, setLogoError] = useState<string | null>(null);

    const gstWarning = gstNumber.trim() && !isValidGstFormat(gstNumber) ? "This doesn't look like a valid 15-character GSTIN — double-check it, but you can still save." : null;

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoError(null);

        if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
            setLogoError("Use PNG, JPG, or SVG.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setLogoError("Logo must be under 2MB.");
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setLogoPreview(objectUrl);
        setLogoUploading(true);

        try {
            const formData = new FormData();
            formData.append("logo", file);
            const res = await fetch("/api/user/logo", { method: "POST", body: formData });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Upload failed");
            setLogoUrl(body.logoUrl);
            router.refresh();
        } catch (error) {
            setLogoError(error instanceof Error ? error.message : "Failed to upload logo. Please try again.");
        } finally {
            setLogoUploading(false);
            setLogoPreview(null);
            URL.revokeObjectURL(objectUrl);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveLogo = async () => {
        setLogoError(null);
        setLogoUploading(true);
        try {
            const res = await fetch("/api/user/logo", { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to remove logo");
            setLogoUrl(null);
            router.refresh();
        } catch {
            setLogoError("Failed to remove logo. Please try again.");
        } finally {
            setLogoUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const company = formData.get("company") as string;
        const businessAddress = formData.get("businessAddress") as string;
        const businessPhone = formData.get("businessPhone") as string;
        const bankAccountName = formData.get("bankAccountName") as string;
        const bankAccountNumber = formData.get("bankAccountNumber") as string;
        const bankIfsc = formData.get("bankIfsc") as string;
        const bankName = formData.get("bankName") as string;

        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, company, businessAddress, businessPhone, gstNumber, bankAccountName, bankAccountNumber, bankIfsc, bankName }),
            });

            if (!res.ok) throw new Error("Failed to update profile");

            setMessage({ type: "success", text: "Profile updated successfully" });
            router.refresh();
        } catch {
            setMessage({ type: "error", text: "Something went wrong. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    const displayedLogo = logoPreview || logoUrl;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled className="bg-surface-muted" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={initialName}
                    placeholder="Enter your name"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                    id="company"
                    name="company"
                    defaultValue={initialCompany}
                    placeholder="Enter company name"
                />
            </div>

            <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-lg border border-border bg-surface-muted flex items-center justify-center overflow-hidden shrink-0">
                        {logoUploading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                        ) : displayedLogo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={displayedLogo} alt="Company logo" className="h-full w-full object-contain" />
                        ) : (
                            <span className="text-[10px] text-text-muted text-center px-1">No logo</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={logoUploading}>
                                {logoUrl ? "Replace" : "Upload"}
                            </Button>
                            {logoUrl && !logoUploading && (
                                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLogo}>
                                    <X className="w-3.5 h-3.5 mr-1" />
                                    Remove
                                </Button>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml"
                            className="hidden"
                            onChange={handleLogoChange}
                        />
                        <p className="text-xs text-text-muted">PNG, JPG, or SVG. Max 2MB.</p>
                        {logoError && <p className="text-xs text-danger">{logoError}</p>}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Input
                    id="businessAddress"
                    name="businessAddress"
                    defaultValue={initialBusinessAddress}
                    placeholder="Shown on the quotation letterhead"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="businessPhone">Business Phone</Label>
                <Input
                    id="businessPhone"
                    name="businessPhone"
                    defaultValue={initialBusinessPhone}
                    placeholder="Shown on the quotation letterhead"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                    id="gstNumber"
                    name="gstNumber"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="Optional"
                />
                {gstWarning && <p className="text-xs text-warning">{gstWarning}</p>}
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-text-muted text-xs uppercase font-semibold">Bank Details (shown on invoices)</Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="bankAccountName">Account Holder Name</Label>
                    <Input id="bankAccountName" name="bankAccountName" defaultValue={initialBankAccountName} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Account Number</Label>
                    <Input id="bankAccountNumber" name="bankAccountNumber" defaultValue={initialBankAccountNumber} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bankIfsc">IFSC Code</Label>
                    <Input id="bankIfsc" name="bankIfsc" defaultValue={initialBankIfsc} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bankName">Bank & Branch</Label>
                    <Input id="bankName" name="bankName" defaultValue={initialBankName} placeholder="Optional" />
                </div>
            </div>

            {message && (
                <div className={`text-sm ${message.type === "success" ? "text-success" : "text-danger"}`}>
                    {message.text}
                </div>
            )}

            <div className="pt-4">
                <Button type="submit" isLoading={loading}>
                    Save Changes
                </Button>
            </div>
        </form>
    );
}
