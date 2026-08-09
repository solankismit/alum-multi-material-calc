"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, LayoutDashboard, Settings, LogOut, Menu, X, User, Receipt, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface NavbarProps {
    user?: {
        name?: string | null;
        email?: string | null;
        role?: string;
    } | null;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

export default function Navbar({ user }: NavbarProps) {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Root ("/") only matches exactly, otherwise every path would highlight
    // it. Every other nav item matches its own path and any nested route
    // beneath it (e.g. /quotations/123 highlights "Quotations").
    const isActive = (path: string) =>
        path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    // Dashboard doubles as the worksheets list (WorksheetList renders there),
    // so there is no separate "Worksheets" destination to link to.
    const navItems: NavItem[] = [
        { href: "/", label: "Calculator", icon: Calculator },
        ...(user ? [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
        ...(user ? [{ href: "/quotations", label: "Quotations", icon: Receipt }] : []),
        ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
    ];

    return (
        <nav className="bg-surface border-b border-border sticky top-0 z-50 print:hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                                    <Calculator className="h-5 w-5" />
                                </div>
                                <span className="font-bold text-xl text-text hidden sm:block">AlumCalc</span>
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                                        isActive(item.href)
                                            ? "border-primary text-primary"
                                            : "border-transparent text-text-muted hover:border-border-strong hover:text-text"
                                    )}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center gap-4">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <Link href="/dashboard/settings">
                                    <Button variant="ghost" size="sm" className={isActive("/dashboard/settings") ? "bg-surface-muted" : ""}>
                                        <Settings className="h-4 w-4 mr-2" />
                                        Settings
                                    </Button>
                                </Link>
                                <div className="h-6 w-px bg-border"></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-text font-medium">{user.name || user.email}</span>
                                    <form action="/api/auth/logout" method="POST">
                                        <Button variant="ghost" size="sm" className="text-danger hover:text-danger hover:bg-danger-surface">
                                            <LogOut className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link href="/login">
                                    <Button variant="ghost" size="sm">Log in</Button>
                                </Link>
                                <Link href="/register">
                                    <Button size="sm">Sign up</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button
                            onClick={toggleMenu}
                            className="inline-flex items-center justify-center p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? (
                                <X className="block h-6 w-6" aria-hidden="true" />
                            ) : (
                                <Menu className="block h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="sm:hidden">
                    <div className="pt-2 pb-3 space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-2 pl-3 pr-4 py-2 border-l-4 text-base font-medium",
                                    isActive(item.href)
                                        ? "bg-primary/5 border-primary text-primary"
                                        : "border-transparent text-text-muted hover:bg-surface-muted hover:border-border-strong hover:text-text"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        ))}
                    </div>
                    <div className="pt-4 pb-4 border-t border-border">
                        {user ? (
                            <div className="space-y-1">
                                <div className="px-4 flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-surface-muted flex items-center justify-center text-text-muted">
                                            <User className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <div className="text-base font-medium text-text">{user.name || "User"}</div>
                                        <div className="text-sm font-medium text-text-muted">{user.email}</div>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1">
                                    <Link
                                        href="/dashboard/settings"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="block px-4 py-2 text-base font-medium text-text-muted hover:text-text hover:bg-surface-muted"
                                    >
                                        Settings
                                    </Link>
                                    <form action="/api/auth/logout" method="POST">
                                        <button
                                            type="submit"
                                            className="block w-full text-left px-4 py-2 text-base font-medium text-text-muted hover:text-text hover:bg-surface-muted"
                                        >
                                            Sign out
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 space-y-1 px-4">
                                <Link
                                    href="/login"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block text-center w-full px-4 py-2 border border-border rounded-md shadow-sm text-base font-medium text-text bg-surface hover:bg-surface-muted mb-2"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href="/register"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block text-center w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-primary-foreground bg-primary hover:bg-primary-hover"
                                >
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
