"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
                        Sign in to your account
                    </h2>
                </div>
                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    <Input
                        id="email-address"
                        name="email"
                        type="email"
                        required
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-label="Email address"
                    />
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-label="Password"
                    />

                    {error && (
                        <div className="text-center text-sm text-danger">{error}</div>
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
    );
}
