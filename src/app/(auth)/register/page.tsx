"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        company: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    company: formData.company,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Something went wrong");
            }

            router.refresh();
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-surface-muted">
            <div className="w-full max-w-md space-y-8 rounded-lg bg-surface p-8 shadow-md">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-text">
                        Create an account
                    </h2>
                </div>
                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleChange}
                        aria-label="Full Name"
                    />
                    <Input
                        id="email-address"
                        name="email"
                        type="email"
                        required
                        placeholder="Email address"
                        value={formData.email}
                        onChange={handleChange}
                        aria-label="Email address"
                    />
                    <Input
                        id="company"
                        name="company"
                        type="text"
                        placeholder="Company Name (Optional)"
                        value={formData.company}
                        onChange={handleChange}
                        aria-label="Company Name"
                    />
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        aria-label="Password"
                    />
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        aria-label="Confirm Password"
                    />

                    {error && (
                        <div className="text-center text-sm text-danger">{error}</div>
                    )}

                    <Button type="submit" isLoading={loading} className="w-full">
                        {loading ? "Creating account..." : "Sign up"}
                    </Button>
                </form>
                <div className="text-center text-sm">
                    <p className="text-text-muted">
                        Already have an account?{" "}
                        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
