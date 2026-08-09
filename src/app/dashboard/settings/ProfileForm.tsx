"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface ProfileFormProps {
    initialName: string;
    initialCompany: string;
    initialBusinessAddress?: string;
    initialBusinessPhone?: string;
    initialGstNumber?: string;
    email: string;
}

export function ProfileForm({ initialName, initialCompany, initialBusinessAddress, initialBusinessPhone, initialGstNumber, email }: ProfileFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const company = formData.get("company") as string;
        const businessAddress = formData.get("businessAddress") as string;
        const businessPhone = formData.get("businessPhone") as string;
        const gstNumber = formData.get("gstNumber") as string;

        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, company, businessAddress, businessPhone, gstNumber }),
            });

            if (!res.ok) throw new Error("Failed to update profile");

            setMessage({ type: "success", text: "Profile updated successfully" });
            router.refresh();
        } catch (error) {
            setMessage({ type: "error", text: "Something went wrong. Please try again." });
        } finally {
            setLoading(false);
        }
    };

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
                    defaultValue={initialGstNumber}
                    placeholder="Optional"
                />
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
