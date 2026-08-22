"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calculator, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** Rough, dependency-free strength heuristic — not meant to be authoritative,
 * just enough to tell a user "this is too short" before they submit instead
 * of only finding out after. */
function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string } {
    if (!password) return { score: 0, label: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score++;
    if (score >= 3) return { score: 3, label: "Strong" };
    if (score === 2) return { score: 2, label: "Good" };
    if (score === 1) return { score: 1, label: "Weak" };
    return { score: 0, label: "Too short" };
}

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

    const strength = passwordStrength(formData.password);
    const confirmTouched = formData.confirmPassword.length > 0;
    const passwordsMatch = formData.password === formData.confirmPassword;

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
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-surface">
            {/* Same brand panel as /login — previously this page was a plain
                unbranded card, a jarring visual break from the adjacent sign-in
                screen in the same flow. */}
            <div className="hidden lg:flex flex-col items-center justify-center bg-primary text-primary-foreground p-12">
                <div className="bg-primary-foreground/15 p-5 rounded-2xl mb-6">
                    <Calculator className="h-14 w-14" />
                </div>
                <h1 className="text-4xl font-bold">AlumCalc</h1>
                <p className="mt-3 text-primary-foreground/80 text-center max-w-sm">
                    Quote aluminium jobs in minutes — cutting plans, rate cards, and client quotes in one system.
                </p>
            </div>

            <div className="flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="lg:hidden flex flex-col items-center gap-2 mb-2">
                        <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                            <Calculator className="h-6 w-6" />
                        </div>
                        <span className="font-bold text-xl text-text">AlumCalc</span>
                    </div>
                    <h2 className="text-center text-3xl font-bold tracking-tight text-text">
                        Create your account
                    </h2>
                    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            required
                            label="Full name"
                            placeholder="Priya Sharma"
                            value={formData.name}
                            onChange={handleChange}
                        />
                        <Input
                            id="email-address"
                            name="email"
                            type="email"
                            required
                            label="Work email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                        />
                        <Input
                            id="company"
                            name="company"
                            type="text"
                            label="Company (optional)"
                            placeholder="Shreeji Aluminium Works"
                            value={formData.company}
                            onChange={handleChange}
                        />
                        <div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                label="Password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                            {formData.password.length > 0 && (
                                <div className="mt-1.5">
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full ${i < strength.score ? (strength.score >= 3 ? "bg-success" : strength.score === 2 ? "bg-warning" : "bg-danger") : "bg-border"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="mt-1 text-xs text-text-muted">
                                        {strength.label} — use 8+ characters, mixing letters and numbers works best.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                label="Confirm password"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={confirmTouched && !passwordsMatch ? "border-danger focus:ring-danger" : undefined}
                            />
                            {confirmTouched && (
                                <p className={`mt-1 text-xs flex items-center gap-1 ${passwordsMatch ? "text-success" : "text-danger"}`}>
                                    {passwordsMatch && <Check className="h-3 w-3" />}
                                    {passwordsMatch ? "Passwords match" : "Passwords don't match yet"}
                                </p>
                            )}
                        </div>

                        {error && (
                            <div role="alert" className="text-center text-sm text-danger">{error}</div>
                        )}

                        <Button type="submit" isLoading={loading} className="w-full">
                            {loading ? "Creating account..." : "Create account"}
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
        </div>
    );
}
