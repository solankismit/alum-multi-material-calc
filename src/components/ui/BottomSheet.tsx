"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile-oriented alternative to a centered Dialog — slides up from the
 * bottom edge instead of appearing centered, for dense controls that were
 * previously crammed inline into a header row on small screens (e.g. a
 * settings toolbar or an overflow action list). Built on the same Radix
 * Dialog primitive as `Dialog.tsx` so it gets the same focus trap, ESC
 * handling, and overlay behavior for free.
 */

const BottomSheet = DialogPrimitive.Root;
const BottomSheetTrigger = DialogPrimitive.Trigger;
const BottomSheetClose = DialogPrimitive.Close;

const BottomSheetOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
    />
));
BottomSheetOverlay.displayName = "BottomSheetOverlay";

const BottomSheetContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string }
>(({ className, children, title, ...props }, ref) => (
    <DialogPrimitive.Portal>
        <BottomSheetOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg max-h-[85vh] overflow-y-auto",
                "duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                className
            )}
            {...props}
        >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
            <div className="flex items-center justify-between mb-4">
                <DialogPrimitive.Title className="text-base font-semibold text-text">{title}</DialogPrimitive.Title>
                <DialogPrimitive.Close className="rounded-md p-1 text-text-muted hover:bg-surface-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-primary">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
            </div>
            {children}
        </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
));
BottomSheetContent.displayName = "BottomSheetContent";

export { BottomSheet, BottomSheetTrigger, BottomSheetClose, BottomSheetContent };
