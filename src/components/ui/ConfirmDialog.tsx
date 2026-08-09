"use client";

import { AlertTriangle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "primary";
    isLoading?: boolean;
    onConfirm: () => void;
}

/**
 * Shared "are you sure?" dialog. Replaces the app's scattered
 * `window.confirm()` calls with one consistent, styled confirmation step —
 * and gives actions that previously had no confirmation at all (quotation
 * status changes, duplicate) a chance to be cancelled.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "primary",
    isLoading = false,
    onConfirm,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        {variant === "danger" && (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-surface text-danger">
                                <AlertTriangle className="h-5 w-5" />
                            </span>
                        )}
                        <DialogTitle>{title}</DialogTitle>
                    </div>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === "danger" ? "danger" : "primary"}
                        onClick={onConfirm}
                        isLoading={isLoading}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
