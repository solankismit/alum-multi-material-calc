"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Something went wrong");
            }

            // Force a full page reload to ensure RootLayout updates the session state
            // and the Navbar shows the correct user.
            router.refresh();
            window.location.href = "/dashboard";
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-surface">
            {/* Brand panel — hidden on small screens so the form gets the full
                width where a 50/50 split would otherwise squeeze it too narrow. */}
            <div className="hidden lg:flex flex-col items-center justify-center bg-primary text-primary-foreground p-12">
                <div className="bg-primary-foreground/15 p-5 rounded-2xl mb-6">
                    <Calculator className="h-14 w-14" />
                </div>
                <h1 className="text-4xl font-bold">AlumCalc</h1>
                <p className="mt-3 text-primary-foreground/80 text-center max-w-sm">
                    Aluminium window &amp; door material calculations, quotations, and cutting plans — all in one place.
                </p>
            </div>

            {/* Sign-in form */}
            <div className="flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="lg:hidden flex flex-col items-center gap-2 mb-2">
                        <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                            <Calculator className="h-6 w-6" />
                        </div>
                        <span className="font-bold text-xl text-text">AlumCalc</span>
                    </div>
                    <h2 className="text-center text-3xl font-bold tracking-tight text-text">
                        Sign in to your account
                    </h2>
                    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                        <Input
                            id="email-address"
                            name="email"
                            type="email"
                            required
                            label="Email address"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            aria-describedby={error ? "login-error" : undefined}
                        />
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            label="Password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            aria-describedby={error ? "login-error" : undefined}
                        />

                        {error && (
                            <div id="login-error" role="alert" className="text-center text-sm text-danger">{error}</div>
                        )}

                        <Button type="submit" isLoading={loading} className="w-full">
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>
                    <div className="text-center text-sm">
                        <p className="text-text-muted">
                            Don&apos;t have an account?{" "}
                            <Link href="/register" className="font-medium text-primary hover:text-primary-hover">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
