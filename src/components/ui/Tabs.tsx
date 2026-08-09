"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
    value: string;
    setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
    children: React.ReactNode;
}

function Tabs({ value, onValueChange, className, children }: TabsProps) {
    return (
        <TabsContext.Provider value={{ value, setValue: onValueChange }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <div
            role="tablist"
            className={cn("inline-flex items-center gap-1 rounded-lg bg-surface-muted p-1", className)}
        >
            {children}
        </div>
    );
}

function TabsTrigger({
    value,
    children,
    className,
}: {
    value: string;
    children: React.ReactNode;
    className?: string;
}) {
    const ctx = React.useContext(TabsContext);
    if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
    const isActive = ctx.value === value;

    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => ctx.setValue(value)}
            className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text",
                className
            )}
        >
            {children}
        </button>
    );
}

export { Tabs, TabsList, TabsTrigger };
