"use client";

import * as React from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error";

interface ToastItem {
    id: number;
    message: string;
    variant: ToastVariant;
}

interface ToastContextValue {
    toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

/**
 * Lightweight toast system. Mounted once in the root layout; replaces the
 * app's scattered `alert()` calls for success/error feedback after an
 * action (save, delete, duplicate, status change, ...).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastItem[]>([]);
    const idRef = React.useRef(0);

    const dismiss = React.useCallback((id: number) => {
        setToasts((current) => current.filter((t) => t.id !== id));
    }, []);

    const toast = React.useCallback(
        (message: string, variant: ToastVariant = "success") => {
            const id = ++idRef.current;
            setToasts((current) => [...current, { id, message, variant }]);
            setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
        },
        [dismiss]
    );

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        role="status"
                        className={cn(
                            "flex items-start gap-2 rounded-lg border p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2",
                            t.variant === "success"
                                ? "bg-success-surface border-success-border text-success"
                                : "bg-danger-surface border-danger-border text-danger"
                        )}
                    >
                        {t.variant === "success" ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                        ) : (
                            <XCircle className="h-5 w-5 shrink-0" />
                        )}
                        <p className="flex-1 text-sm font-medium">{t.message}</p>
                        <button
                            type="button"
                            onClick={() => dismiss(t.id)}
                            className="shrink-0 opacity-70 hover:opacity-100"
                            aria-label="Dismiss"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = React.useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}
