"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, LayoutDashboard, Settings, LogOut, Menu, X, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface NavbarProps {
    user?: {
        name?: string | null;
        email?: string | null;
        role?: string;
    } | null;
}

export default function Navbar({ user }: NavbarProps) {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isActive = (path: string) => pathname === path;

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="bg-slate-900 text-white p-1.5 rounded-lg">
                                    <Calculator className="h-5 w-5" />
                                </div>
                                <span className="font-bold text-xl text-slate-900 hidden sm:block">AlumCalc</span>
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                href="/"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive("/")
                                    ? "border-slate-900 text-slate-900"
                                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    }`}
                            >
                                Calculator
                            </Link>
                            {user && (
                                <Link
                                    href="/dashboard"
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive("/dashboard")
                                        ? "border-slate-900 text-slate-900"
                                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        }`}
                                >
                                    Dashboard
                                </Link>
                            )}
                            {user?.role === "ADMIN" && (
                                <Link
                                    href="/admin"
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive("/admin")
                                        ? "border-slate-900 text-slate-900"
                                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        }`}
                                >
                                    Admin
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center gap-4">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <Link href="/dashboard/settings">
                                    <Button variant="ghost" size="sm" className={isActive("/dashboard/settings") ? "bg-slate-100" : ""}>
                                        <Settings className="h-4 w-4 mr-2" />
                                        Settings
                                    </Button>
                                </Link>
                                <div className="h-6 w-px bg-gray-200"></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-700 font-medium">{user.name || user.email}</span>
                                    <form action="/api/auth/logout" method="POST">
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
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
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-500"
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
                        <Link
                            href="/"
                            onClick={() => setIsMenuOpen(false)}
                            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive("/")
                                ? "bg-slate-50 border-slate-500 text-slate-700"
                                : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                                }`}
                        >
                            Calculator
                        </Link>
                        {user && (
                            <Link
                                href="/dashboard"
                                onClick={() => setIsMenuOpen(false)}
                                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive("/dashboard")
                                    ? "bg-slate-50 border-slate-500 text-slate-700"
                                    : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                                    }`}
                            >
                                Dashboard
                            </Link>
                        )}
                        {user?.role === "ADMIN" && (
                            <Link
                                href="/admin"
                                onClick={() => setIsMenuOpen(false)}
                                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive("/admin")
                                    ? "bg-slate-50 border-slate-500 text-slate-700"
                                    : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                                    }`}
                            >
                                Admin
                            </Link>
                        )}
                    </div>
                    <div className="pt-4 pb-4 border-t border-gray-200">
                        {user ? (
                            <div className="space-y-1">
                                <div className="px-4 flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                                            <User className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <div className="text-base font-medium text-gray-800">{user.name || "User"}</div>
                                        <div className="text-sm font-medium text-gray-500">{user.email}</div>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1">
                                    <Link
                                        href="/dashboard/settings"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                    >
                                        Settings
                                    </Link>
                                    <form action="/api/auth/logout" method="POST">
                                        <button
                                            type="submit"
                                            className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
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
                                    className="block text-center w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-slate-600 bg-white hover:bg-gray-50 border-gray-300 mb-2"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href="/register"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block text-center w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-slate-900 hover:bg-slate-800"
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
